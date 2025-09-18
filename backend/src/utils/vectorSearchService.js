// utils/vectorSearchService.js
import { pipeline } from '@xenova/transformers';
import SchemaVector from '../models/SchemaVector.js';
import mongoose from 'mongoose';

// 1. Initialize the local embedding model pipeline
// This will reuse the cached model from your embedding service.
const extractor = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2'
);

// Helper function to create the embedding locally
async function createEmbedding(text) {
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

export async function searchSchemaVectors(tenantId, query, k = 15) {
  try {
    // Step 1: Embed the user query using the LOCAL model
    const queryEmbedding = await createEmbedding(query);

    // Step 2: Perform the Vector Search in MongoDB
    const results = await SchemaVector.aggregate([
      {
        $vectorSearch: {
          queryVector: queryEmbedding,
          path: 'vector',
          numCandidates: 50,
          limit: k,
          index: 'vector_index',
          filter: {
            tenantId: { $eq: new mongoose.Types.ObjectId(tenantId) },
          },
        },
      },
      {
        $project: {
          _id: 0,
          collectionName: 1,
          fieldName: 1,
          description: 1,
          fieldType: 1,
        },
      },
    ]);

    return { ok: true, matches: results };
  } catch (err) {
    console.error('Vector Search Error:', err);
    return { ok: false, error: err.message };
  }
}
