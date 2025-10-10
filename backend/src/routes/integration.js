// backend/src/routes/integration.js
import express from 'express';
import Integration from '../models/Integration.js';
import { MongoClient } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = express.Router();

/**
 * @route   POST /api/integration
 * @desc    Add MongoDB integration for a tenant
 */
router.post('/', authMiddleware, async (req, res) => {
  console.log(req.body);
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

    // --- Verify MongoDB Connection ---
    const client = new MongoClient(connectionUri, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
    });

    try {
      await client.connect();
      await client.db(dbName).command({ ping: 1 }); // Simple ping to check connection
    } catch (err) {
      return res
        .status(400)
        .json({ status: false, error: 'Invalid MongoDB connection URL.' });
    } finally {
      await client.close();
    }
    // --- Save Encrypted URI ---
    const encryptedUri = encrypt(connectionUri);

    const integration = new Integration({
      tenantId,
      type: 'mongodb',
      connectionUri: encryptedUri,
      dbName,
    });

    await integration.save();

    integration.connectionUri = decrypt(integration.connectionUri);

    res.status(201).json({ status: true, integration });
  } catch (err) {
    console.error('Integration Error:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

/**
 * @route   GET /api/integration
 * @desc    Get integrations for a tenant
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ status: false, error: 'Unauthorized access.' });
    }
    const integration = await Integration.findOne({
      tenantId: req.user.tenantId,
    });

    integration.connectionUri = decrypt(integration.connectionUri);

    res.json({ status: true, integration });
  } catch (err) {
    console.error('Fetch Integration Error:', err);
    res.status(500).json({ status: false, error: err.message });
  }
});

/**
 * @route   PUT /api/integration/
 * @desc    Update integration details
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { connectionUri, dbName, status } = req.body;

    if (!req.user.tenantId) {
      return res
        .status(400)
        .json({ status: false, error: "Doesn't belongs to the tenant." });
    }

    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ status: false, error: 'Unauthorized access.' });
    }

    if (!connectionUri || !dbName || !status) {
      return res.status(400).json({
        status: false,
        error: 'connectionUri, dbName and status required',
      });
    }

    const encryptedUri = encrypt(connectionUri);

    const integration = await Integration.findOneAndUpdate(
      { tenantId: req.user.tenantId },
      { connectionUri: encryptedUri, dbName, status },
      { new: true }
    );

    if (!integration) {
      return res
        .status(404)
        .json({ status: false, error: 'Integration not found', integration });
    }

    integration.connectionUri = decrypt(integration.connectionUri);

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
