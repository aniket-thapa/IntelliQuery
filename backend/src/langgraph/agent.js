import { StateGraph, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { searchSchemaVectors } from '../utils/vectorSearchService.js';
import { getTenantDb } from '../utils/mongoClient.js';

// Initial state shape
const initialState = {
  tenantId: null,
  userQuery: '',
  schemaContext: null,
  mongoQuery: null,
  result: null,
  finalAnswer: null, // 🆕 for frontend-friendly text
};

// Build the Agent
export function buildAgent() {
  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-flash',
    temperature: 0,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const graph = new StateGraph({ channels: initialState })

    // 1️⃣ Find schema context using vector search
    .addNode('schemaSearch', async (state) => {
      const response = await searchSchemaVectors(
        state.tenantId,
        state.userQuery,
        12
      );

      if (!response.ok) {
        throw new Error('Schema vector search failed: ' + response.error);
      }

      return { schemaContext: response.matches };
    })

    // 2️⃣ Generate a MongoDB query with Gemini
    .addNode('queryGen', async (state) => {
      const systemPrompt = `
      You are an expert MongoDB query generator.
      Use ONLY the provided schema fields and collections.

      Schema context: ${JSON.stringify(state.schemaContext, null, 2)}

      Return JSON strictly in this format:
      {
        "collection": "<collection>",
        "filter": { ... },
        "projection": { ... },
        "limit": 50
      }
      `;

      const response = await model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: state.userQuery },
      ]);

      let query;
      try {
        console.log('LLM Query Response:', response.content);

        // Remove Markdown code block markers if present
        let cleaned = response.content
          .replace(/```json\s*/gi, '')
          .replace(/```/g, '')
          .trim();

        console.log('Cleaned Query String:', cleaned);

        query = JSON.parse(cleaned);
      } catch (err) {
        console.error('Invalid query JSON:', response.content);
        throw new Error('Failed to parse query JSON');
      }

      return { mongoQuery: query };
    })

    // 3️⃣ Execute query on tenant DB
    .addNode('executor', async (state) => {
      try {
        const db = await getTenantDb(state.tenantId);

        const { collection, filter, projection, limit } = state.mongoQuery;

        const result = await db
          .collection(collection)
          .find(filter || {}, { projection })
          .limit(limit || 50)
          .toArray();

        return { result };
      } catch (err) {
        console.error('Execution Error:', err);
        return { result: { error: err.message } };
      }
    })

    // 4️⃣ Format a user-friendly response
    .addNode('responseFormatter', async (state) => {
      const prompt = `
You are an assistant helping to explain database results to non-technical users.

The user asked: "${state.userQuery}"
The raw database result was: ${JSON.stringify(state.result, null, 2)}

Write a short, clear, and user-friendly response for a chat UI.
- If result is empty → say "No matching records found."
- If result has multiple objects → summarize clearly, maybe list names or counts.
- Keep it concise and human-readable.
      `;

      try {
        const resp = await model.invoke(prompt);

        console.log('Final Answer Response:', resp.content);
        return { finalAnswer: resp.content };
      } catch (err) {
        console.error('Response Formatter Error:', err);
        return {
          finalAnswer: 'I found some data, but failed to generate a summary.',
        };
      }
    })

    // Graph flow
    .addEdge('schemaSearch', 'queryGen')
    .addEdge('queryGen', 'executor')
    .addEdge('executor', 'responseFormatter')
    .addEdge('responseFormatter', END)
    .setEntryPoint('schemaSearch');

  return graph.compile();
}
