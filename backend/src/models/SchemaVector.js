// models/SchemaVector.js
import mongoose from 'mongoose';

const schemaVectorSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    collectionName: { type: String, required: true },
    fieldName: { type: String, required: true },
    fieldType: { type: String, required: true },
    description: String,
    vector: { type: [Number], index: 'vector' }, // Atlas Vector Index
  },
  { timestamps: true }
);

export default mongoose.model('SchemaVector', schemaVectorSchema);
