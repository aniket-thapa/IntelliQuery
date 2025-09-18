import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'string',
        'number',
        'date',
        'boolean',
        'ObjectId',
        'object',
        'array',
      ],
    },
    description: String,
    synonyms: [String],
  },
  { _id: false }
);

fieldSchema.add({
  fields: [fieldSchema],
  of: {
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'boolean', 'ObjectId', 'object'],
    },

    fields: [fieldSchema],
  },
});

const collectionSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    fields: [fieldSchema],
  },
  { _id: false }
);

const databaseSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    databaseName: { type: String, required: true },
    collections: [collectionSchema],
  },
  { timestamps: true }
);

export default mongoose.model('DatabaseSchema', databaseSchema);
