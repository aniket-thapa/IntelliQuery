// backend/src/routes/integration.js
import express from 'express';
import Integration from '../models/Integration.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/integration
 * @desc    Add MongoDB integration for a tenant
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tenantId, connectionUri, dbName } = req.body;

    if (!tenantId || !connectionUri || !dbName) {
      return res
        .status(400)
        .json({ status: false, error: 'All fields are required.' });
    }

    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ status: false, error: 'Unauthorized access.' });
    }

    const existingIntegration = await Integration.findOne({ tenantId });
    if (existingIntegration) {
      return res.status(400).json({
        status: false,
        error: 'Integration already exists for this tenant.',
      });
    }

    const integration = new Integration({
      tenantId,
      type: 'mongodb',
      connectionUri,
      dbName,
    });

    await integration.save();

    res.status(201).json({ status: true, integration });
  } catch (err) {
    console.error('Integration Error:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

/**
 * @route   GET /api/integration/:tenantId
 * @desc    Get integrations for a tenant
 */
router.get('/:tenantId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ status: false, error: 'Unauthorized access.' });
    }
    const integrations = await Integration.find({
      tenantId: req.params.tenantId,
    });

    res.json({ status: true, integrations });
  } catch (err) {
    console.error('Fetch Integration Error:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

/**
 * @route   PUT /api/integration/:id
 * @desc    Update integration details
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { connectionUri, dbName, status } = req.body;

    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ status: false, error: 'Unauthorized access.' });
    }

    const integration = await Integration.findByIdAndUpdate(
      req.params.id,
      { connectionUri, dbName, status },
      { new: true }
    );

    if (!integration) {
      return res
        .status(404)
        .json({ status: false, error: 'Integration not found' });
    }

    res.json({ status: true, integration });
  } catch (err) {
    console.error('Update Integration Error:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

/**
 * @route   DELETE /api/integration/:id
 * @desc    Remove integration
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ status: false, error: 'Unauthorized access.' });
    }

    const integration = await Integration.findByIdAndDelete(req.params.id);

    if (!integration) {
      return res
        .status(404)
        .json({ status: false, error: 'Integration not found' });
    }

    res.json({ status: true, message: 'Integration removed' });
  } catch (err) {
    console.error('Delete Integration Error:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

export default router;
