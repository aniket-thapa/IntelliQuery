// backend/src/routes/onboarding.js
import express from 'express';
import DatabaseSchema from '../models/DatabaseSchema.js';
import Integration from '../models/Integration.js';
import Tenant from '../models/Tenant.js';
import { authMiddleware } from '../middleware/auth.js';

import { processSchemaEmbeddings } from '../utils/embeddingService.js';

const router = express.Router();

/**
 * @route   GET /api/onboarding/status
 * @desc    Check if the tenant has completed the onboarding process
 * @access  Private
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const { tenantId } = req.user;
    if (!tenantId) {
      return res
        .status(400)
        .json({ status: false, error: 'User is not part of a tenant.' });
    }

    // Check for both integration and schema in parallel for efficiency
    const [integration, schema] = await Promise.all([
      Integration.findOne({ tenantId }),
      DatabaseSchema.findOne({ tenantId }),
    ]);

    const progress = {
      hasConnectedDb: !!integration,
      hasProvidedSchema: !!schema,
    };

    res.json({
      status: true,
      isOnboarded: progress.hasConnectedDb && progress.hasProvidedSchema,
      progress,
    });
  } catch (err) {
    console.error('Onboarding status error:', err.message);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});

// Upload database schema JSON
router.post('/schema', authMiddleware, async (req, res) => {
  try {
    const { databaseName, collections } = req.body;
    const tenantId = req.user.tenantId;

    if (!databaseName || !collections) {
      return res.status(400).json({
        status: false,
        error: 'Database name and collections are required',
      });
    }

    // Check if tenant exists
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ status: false, error: 'Tenant not found' });
    }

    const isSchemaExist = await DatabaseSchema.findOne({ tenantId });
    if (isSchemaExist) {
      return res.status(400).json({
        status: false,
        error: 'Schema already exists for this tenant',
      });
    }

    // Save schema
    const dbSchema = new DatabaseSchema({
      tenantId,
      databaseName,
      collections,
    });

    await dbSchema.save();

    // Trigger embeddings
    processSchemaEmbeddings(tenantId, dbSchema)
      .then((res) => console.log('Embeddings processed:', res))
      .catch((err) => console.error('Embedding error:', err.message));

    res.json({
      status: true,
      message: 'Schema uploaded successfully. Embeddings are being processed.',
      schema: dbSchema,
    });
  } catch (err) {
    console.error('Schema upload error:', err.message);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});

// Get schema for current tenant
router.get('/schema', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const schema = await DatabaseSchema.findOne({ tenantId });
    if (!schema) {
      return res.status(404).json({ status: false, error: 'Schema not found' });
    }

    res.json({ status: true, schema });
  } catch (err) {
    console.error('Get schema error:', err.message);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});

// Update schema for tenant
router.put('/schema', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, collections } = req.body;

    const dbSchema = await DatabaseSchema.findOne({ tenantId });
    if (!dbSchema) {
      return res.status(404).json({ status: false, error: 'Schema not found' });
    }

    if (name) dbSchema.name = name;
    if (collections) dbSchema.collections = collections;

    await dbSchema.save();

    // Re-process embeddings
    processSchemaEmbeddings(tenantId, dbSchema)
      .then((res) => console.log('Embeddings re-processed:', res))
      .catch((err) => console.error('Embedding error:', err.message));

    res.json({
      status: true,
      message: 'Schema updated. Embeddings are re-processing.',
      dbSchema,
    });
  } catch (err) {
    console.error('Update schema error:', err.message);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});

// Delete schema
router.delete('/schema', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res
        .status(400)
        .json({ status: false, error: 'Tenant ID missing' });
    }

    if (!req.user.role || req.user.role === 'member') {
      return res.status(403).json({ status: false, error: 'Forbidden' });
    }

    const schema = await DatabaseSchema.findOneAndDelete({ tenantId });
    if (!schema) {
      return res.status(404).json({ status: false, error: 'Schema not found' });
    }

    res.json({ status: true, message: 'Schema deleted' });
  } catch (err) {
    console.error('Delete schema error:', err.message);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});

export default router;
