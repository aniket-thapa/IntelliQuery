// src/langgraph/agent.js
import { StateGraph, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { searchSchemaVectors } from '../utils/vectorSearchService.js';
import { getTenantDb } from '../utils/mongoClient.js';

import generateMongoQuery from './tools/queryGen.js';
import repairMongoQuery from './tools/queryRepair.js';
import formatResponse from './tools/responseFormatter.js';
import { estimateAndTrimHistory } from '../utils/tokenUtils.js';
import { mongo } from 'mongoose';

const MAX_REPAIR_RETRIES = 2; // number of times LLM can repair a bad query

const initialState = {
  tenantId: null,
  userQuery: '',
  schemaContext: null,
  mongoQuery: null,
  result: null,
  finalAnswer: null,
  tableData: null,
  recentMessages: [], // last few messages (user+agent) for context
};

export function buildAgent() {
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-flash',
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.0,
  });

  const graph = new StateGraph({ channels: initialState })

    // 1) vector search => schema context
    .addNode('schemaSearch', async (state) => {
      if (!state.tenantId || !state.userQuery)
        throw new Error('Missing tenantId or userQuery');

      const vs = await searchSchemaVectors(state.tenantId, state.userQuery, 10);
      if (!vs.ok) throw new Error('Vector search failed: ' + vs.error);

      // keep schemaContext but trimmed (we will also trim messages)
      return { schemaContext: vs.matches };
    })

    // 2) generate a MongoDB query using the model + recentMessages
    .addNode('queryGen', async (state) => {
      // reduce context size if needed
      const recentMessages = estimateAndTrimHistory(state.recentMessages, 3500); // approx chars
      const schemaContext = JSON.stringify(state.schemaContext || []);

      const mq = await generateMongoQuery({
        userQuery: state.userQuery,
        schemaContext,
        recentMessages,
        model,
      });

      return { mongoQuery: mq };
    })

    // 3) execute query; if execution error occurs, attempt to repair via LLM
    .addNode('executor', async (state) => {
      const db = await getTenantDb(state.tenantId);
      if (!state.mongoQuery || !state.mongoQuery.collection) {
        return { result: { error: 'No valid mongoQuery to execute' } };
      }

      // attempt & repair loop
      let attempt = 0;
      let lastQuery = state.mongoQuery;
      while (attempt <= MAX_REPAIR_RETRIES) {
        try {
          // Basic safety check
          const serialized = JSON.stringify(lastQuery).toLowerCase();
          const forbidden = [
            'drop',
            'remove',
            'delete',
            'update',
            '$where',
            'eval',
            'mapreduce',
          ];
          for (const f of forbidden)
            if (serialized.includes(f)) {
              return {
                result: { error: 'Query contains forbidden operations' },
              };
            }

          // Run query
          const col = db.collection(lastQuery.collection);
          if (lastQuery.aggregate && Array.isArray(lastQuery.aggregate)) {
            const rows = await col
              .aggregate(lastQuery.aggregate, { maxTimeMS: 15000 })
              .toArray();
            return { result: { ok: true, rows } };
          } else {
            const cursor = col.find(lastQuery.filter || {}, {
              projection: lastQuery.projection || {},
            });
            if (lastQuery.limit) cursor.limit(lastQuery.limit);
            const rows = await cursor.toArray();
            return { result: { ok: true, rows } };
          }
        } catch (err) {
          // Execution failed: ask LLM to repair
          attempt += 1;
          if (attempt > MAX_REPAIR_RETRIES) {
            return {
              result: {
                error: 'Execution failed after retries: ' + err.message,
              },
            };
          }
          // Ask LLM to repair, provide error message and the failing query & schema context
          const repaired = await repairMongoQuery({
            failingQuery: lastQuery,
            errorMessage: err.message,
            schemaContext: state.schemaContext,
            recentMessages: estimateAndTrimHistory(state.recentMessages, 3000),
            model,
          });
          // repair function returns parsed JSON or throws
          lastQuery = repaired;
          // loop to attempt execution again
        }
      }

      return { result: { error: 'Unexpected executor flow' } };
    })

    // 4) format final answer (friendly text + optional tableData)
    .addNode('responseFormatter', async (state) => {
      // We give the formatter the original userQuery, schemaContext, and raw rows
      const rows = state.result?.rows ?? [];
      const formatterContext = {
        userQuery: state.userQuery,
        schemaContext: state.schemaContext,
        mongoQuery: state.mongoQuery,
        rows,
      };

      const { finalAnswer, tableData } = await formatResponse({
        context: formatterContext,
        model,
        maxTokensForAnswer: 512,
      });

      return { finalAnswer, tableData };
    })

    // flow edges
    .addEdge('__start__', 'schemaSearch')
    .addEdge('schemaSearch', 'queryGen')
    .addEdge('queryGen', 'executor')
    .addEdge('executor', 'responseFormatter')
    .addEdge('responseFormatter', END);

  return graph.compile();
}
