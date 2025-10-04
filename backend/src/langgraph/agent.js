// src/langgraph/agent.js
import { StateGraph, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { searchSchemaVectors } from '../utils/vectorSearchService.js';
import { getTenantDb } from '../utils/mongoClient.js';
import generateMongoQuery from './tools/queryGen.js';
import repairMongoQuery from './tools/queryRepair.js';
import formatResponse from './tools/responseFormatter.js';
import { estimateAndTrimHistory } from '../utils/tokenUtils.js';

const MAX_REPAIR_RETRIES = 2;

const initialState = {
  tenantId: null,
  userQuery: '',
  recentMessages: [],
  schemaContext: null,
  mongoQuery: null,
  result: null,
  finalAnswer: null,
  tableData: null,
};

export function buildAgent() {
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-2.0-flash',
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.0,
  });

  const graph = new StateGraph({ channels: initialState })

    // ENTRY point
    .addEdge('__start__', 'schemaSearch')

    // 1) Schema search node
    .addNode('schemaSearch', async (state) => {
      if (!state.tenantId) throw new Error('tenantId required');
      if (!state.userQuery) throw new Error('userQuery required');

      const trimmedHistory = estimateAndTrimHistory(state.recentMessages, 3000);
      const vs = await searchSchemaVectors(state.tenantId, state.userQuery, 15);
      if (!vs.ok) throw new Error('Vector search failed: ' + vs.error);
      return { schemaContext: vs.matches, recentMessages: trimmedHistory };
    })

    // 2) Query generation node (first attempt)
    .addNode('queryGen', async (state) => {
      const shortSchema = JSON.stringify(
        (state.schemaContext || []).slice(0, 12),
        null,
        2
      );
      const recent = state.recentMessages || [];

      const mq = await generateMongoQuery({
        userQuery: state.userQuery,
        schemaContext: shortSchema,
        recentMessages: recent,
        model,
      });
      return { mongoQuery: mq };
    })

    // 3) Executor node (executes and repairs on error)
    .addNode('executor', async (state) => {
      if (!state.mongoQuery?.pipeline || !state.mongoQuery?.collection) {
        return {
          result: {
            status: false,
            error:
              'State is missing mongoQuery.pipeline or mongoQuery.collection',
          },
        };
      }
      const db = await getTenantDb(state.tenantId);
      let lastPipeline = state.mongoQuery.pipeline;
      let collectionName = state.mongoQuery.collection;
      let attempt = 0;

      while (attempt <= MAX_REPAIR_RETRIES) {
        try {
          const rows = await db
            .collection(collectionName)
            .aggregate(lastPipeline, { maxTimeMS: 15000 })
            .toArray();
          return {
            result: { status: true, rows },
            mongoQuery: { pipeline: lastPipeline, collection: collectionName },
          };
        } catch (err) {
          console.error(
            `Execution attempt ${attempt + 1} failed:`,
            err.message
          );
          attempt += 1;
          if (attempt > MAX_REPAIR_RETRIES) {
            return {
              result: {
                status: false,
                error: `Execution failed after ${MAX_REPAIR_RETRIES} retries: ${err.message}`,
              },
            };
          }
          const trimmedHistory = estimateAndTrimHistory(
            state.recentMessages,
            2500
          );
          const repairedQuery = await repairMongoQuery({
            failingQuery: {
              pipeline: lastPipeline,
              collection: collectionName,
            },
            errorMessage: err.message,
            schemaContext: state.schemaContext,
            recentMessages: trimmedHistory,
            model,
          });
          if (repairedQuery?.pipeline && repairedQuery?.collection) {
            lastPipeline = repairedQuery.pipeline;
            collectionName = repairedQuery.collection;
          } else {
            return {
              result: {
                status: false,
                error: 'Query repair failed to return a valid format.',
              },
            };
          }
        }
      }

      return {
        result: { status: false, error: 'Executor flow ended unexpectedly' },
      };
    })

    // 4) Response formatter - user friendly + tableData
    .addNode('responseFormatter', async (state) => {
      const rows = state.result?.rows ?? [];
      const context = {
        userQuery: state.userQuery,
        schemaContext: state.schemaContext,
        rows,
      };
      const { finalAnswer, tableData } = await formatResponse({
        context,
        model,
      });
      return { finalAnswer, tableData };
    })

    // flow edges
    .addEdge('schemaSearch', 'queryGen')
    .addEdge('queryGen', 'executor')
    .addEdge('executor', 'responseFormatter')
    .addEdge('responseFormatter', END);

  return graph.compile();
}
