// models/QueryLog.js
import mongoose from 'mongoose';

const queryLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    naturalQuery: String, // "How many users joined last month?"
    resolvedCollections: [String],
    resolvedFields: [String],
    mongoQuery: mongoose.Schema.Types.Mixed, // actual Mongo query object
    executionTimeMs: Number,
    resultSample: mongoose.Schema.Types.Mixed, // preview of data
    status: { type: String, enum: ['success', 'error'], default: 'success' },
    errorMessage: String,
  },
  { timestamps: true }
);

export default mongoose.model('QueryLog', queryLogSchema);
