// services/embeddingService.js
import { pipeline } from '@xenova/transformers';
import SchemaVector from '../models/SchemaVector.js';

// Create a reusable pipeline for feature extraction (embedding)
// This will download the model on the first run and cache it.
const extractor = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2'
);

// A helper function to create a single embedding
async function createEmbedding(text) {
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  // Convert the Tensor into a regular JavaScript array
  return Array.from(result.data);
}

export async function processSchemaEmbeddings(tenantId, dbSchema) {
  try {
    const docs = [];
    for (const collection of dbSchema.collections) {
      for (const field of collection.fields) {
        const text = `${collection.name}.${field.name} - ${
          field.description || ''
        } (${field.type})`;
        docs.push({
          tenantId,
          collectionName: collection.name,
          fieldName: field.name,
          fieldType: field.type,
          description: field.description || '',
          text,
        });
      }
    }

    if (docs.length === 0) return { count: 0 };

    // Generate embeddings for all documents LOCALLY
    // No API calls, no rate limits!
    for (const doc of docs) {
      doc.vector = await createEmbedding(doc.text);
    }

    // Delete old vectors before inserting new ones
    await SchemaVector.deleteMany({ tenantId });

    if (docs.length > 0) {
      await SchemaVector.insertMany(docs);
    }

    return { count: docs.length };
  } catch (err) {
    console.error('Local Embedding Error:', err);
    return { error: err.message };
  }
}
