// src/langgraph/agent.js
import { StateGraph, END, START } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { searchSchemaVectors } from '../utils/vectorSearchService.js';
import { getTenantDb } from '../utils/mongoClient.js';
import generateMongoQuery from './tools/queryGen.js';
import repairMongoQuery from './tools/queryRepair.js';
import formatResponse from './tools/responseFormatter.js';
import { estimateAndTrimHistory } from '../utils/tokenUtils.js';
import extractAndParseJson from '../utils/extractAndParseJson.js';

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
    model: 'gemini-2.5-flash',
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.0,
  });

  const graph = new StateGraph({ channels: initialState })

    // --- NEW NODE: 1) Query Classifier ---
    // This node runs first to decide if the query is a data question
    // or just general chit-chat.
    .addNode('queryClassifier', async (state) => {
      const { userQuery, recentMessages } = state;

      const history = estimateAndTrimHistory(recentMessages, 1000)
        .map((m) => `${m.sender}: ${m.text}`)
        .join('\n');

      const prompt = `
You are a professional AI Data Analyst assistant (namely, IntelliQuery). Your primary purpose is to help users by querying their database to find insights, answer questions, and generate reports.

Your first task is to analyze the user's most recent message and classify its INTENT.

The user's query is: "${userQuery}"

Conversation History (for context):
${history}

You must choose one of two classifications:
1.  **data_query**: The user is asking a question that requires searching, aggregating, or analyzing data from their database. This includes requests for numbers, lists, trends, specific records, or data visualizations.
2.  **general_query**: The user is *not* asking for data. This includes greetings, pleasantries, questions about your identity or capabilities, general knowledge questions, nonsensical input, or expressions of thanks/frustration.

**Response Strategy:**
* If the intent is **data_query**, you MUST return an empty response. The query will be passed to the data analysis pipeline.
* If the intent is **general_query**, you must provide a concise, professional, and helpful response.
* **Your Persona**: You are a polite, business-focused assistant. Your goal is to be helpful but always pivot the conversation back to your core function: data analysis.
* **Rule**: **Do NOT** answer general knowledge questions (e.g., "What is the capital of France?", "What's the weather?"). Politely decline and redirect the user to a data-related topic. You make a best response to the user's query, but always pivot back to your core function: data analysis.

**Output Format:**
You MUST return a single, valid JSON object with two keys:
1.  "classification": (string) "data_query" or "general_query"
2.  "response": (string) The response to the user query (can be in Markdown). This MUST be an empty string ("") if the classification is "data_query".

---
**High-Quality Examples (Do not stick to these examples and be creative):**

User: "How many users signed up last month?"
{ "classification": "data_query", "response": "" }

User: "show me the top 5 customers by revenue"
{ "classification": "data_query", "response": "" }

User: "Hello"
{ "classification": "general_query", "response": "Hello! How can I assist you with your data insights today?" }

User: "Hi there, good morning"
{ "classification": "general_query", "response": "Good morning. What data can I help you analyze?" }

User: "Who are you?"
{ "classification": "general_query", "response": "I am an AI data assistant. I can help you query your database and visualize the results. How can I help?" }

User: "What can you do?"
{ "classification": "general_query", "response": "I can analyze your database to answer natural language questions. For example, you can ask me 'What were the total sales in the last quarter?' or 'Show me all users from New York.'" }

User: "Thanks"
{ "classification": "general_query", "response": "You're welcome! Is there anything else I can help you with?" }

User: "Great, that was helpful"
{ "classification": "general_query", "response": "I'm glad I could help. Do you have any other data questions?" }

User: "???"
{ "classification": "general_query", "response": "I'm sorry, I didn't quite understand that. Could you please rephrase your data request?" }

User: "12345"
{ "classification": "general_query", "response": "I'm not sure what you mean by that. Can you please ask me a specific question about your data?" }

User: "asdfasdf"
{ "classification": "general_query", "response": "I'm sorry, I'm not able to process that request. Please ask me a data-related question." }

User: "What is the capital of France?"
{ "classification": "general_query", "response": "I'm designed to focus on your database. I'm afraid I can't provide general knowledge. Do you have a data-related question I can help with?" }

User: "What's the weather like?"
{ "classification": "general_query", "response": "My apologies, but I'm a data analyst, not a weather service. I can help you with questions about your database." }

User: "help"
{ "classification": "general_query", "response": "I'm happy to help. Please ask me a specific question about your data, such as 'What are the top-selling products?'" }

User: "That's wrong"
{ "classification": "general_query", "response": "My apologies. Could you please clarify what was incorrect or ask your question in a different way so I can try again?" }
---

Provide only the valid JSON object and nothing else.
      `;

      const response = await model.invoke(prompt);
      let directResponse = null;

      try {
        const parsed = extractAndParseJson(response.content);
        if (parsed && parsed.classification === 'general_query' && parsed.response) {
          directResponse = parsed.response;
        }
      } catch (e) {
        console.warn(
          'Classifier parse failed, defaulting to data_query',
          e.message
        );
      }
      if (directResponse) {
        return { finalAnswer: directResponse };
      }
      return {};
    })

    // 2) Schema search node
    .addNode('schemaSearch', async (state) => {
      if (!state.tenantId) throw new Error('tenantId required');
      if (!state.userQuery) throw new Error('userQuery required');

      const trimmedHistory = estimateAndTrimHistory(state.recentMessages, 3000);
      const vs = await searchSchemaVectors(state.tenantId, state.userQuery, 15);
      if (!vs.ok) throw new Error('Vector search failed: ' + vs.error);
      return { schemaContext: vs.matches, recentMessages: trimmedHistory };
    })

    // 3) Query generation node (first attempt)
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

    // 4) Executor node (executes and repairs on error)
    .addNode('executor', async (state) => {
      if (!state.mongoQuery?.pipeline || !state.mongoQuery?.collection) {
        return {
          result: {
            status: false,
            error: state.mongoQuery?.error || 'State is missing mongoQuery.pipeline or mongoQuery.collection',
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

    // 5) Response formatter - user friendly + tableData
    .addNode('responseFormatter', async (state) => {
      const rows = state.result?.rows ?? [];
      const error = state.result?.error;
      const context = {
        userQuery: state.userQuery,
        schemaContext: state.schemaContext,
        rows,
        error,
      };
      const { finalAnswer, tableData } = await formatResponse({
        context,
        model,
      });
      return { finalAnswer, tableData };
    });

  // --- Graph Edges (Routing) ---

  // 1. Entry point now goes to the new classifier
  graph.addEdge(START, 'queryClassifier');

  // 2. Add conditional routing from the classifier
  graph.addConditionalEdges(
    'queryClassifier', // The source node
    (state) => {
      // The condition function:
      // If finalAnswer is set, it was a general query, so we end.
      if (state.finalAnswer) {
        return 'end_conversation';
      }
      // Otherwise, it's a data query, so we run the full pipeline.
      return 'run_data_pipeline';
    },
    {
      // The path map:
      end_conversation: END, // 'end_conversation' maps to the graph END
      run_data_pipeline: 'schemaSearch', // 'run_data_pipeline' maps to the next step
    }
  );

  // 3. The rest of the original pipeline flow remains the same
  graph.addEdge('schemaSearch', 'queryGen');
  graph.addEdge('queryGen', 'executor');
  graph.addEdge('executor', 'responseFormatter');
  graph.addEdge('responseFormatter', END);

  return graph.compile();
}
