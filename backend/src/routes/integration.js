import express from 'express';
import Integration from '../models/Integration.js';

const router = express.Router();

/**
 * @route   POST /api/integration
 * @desc    Add MongoDB integration for a tenant
 */
router.post('/', async (req, res) => {
  try {
    const { tenantId, connectionUri, dbName } = req.body;

    if (!tenantId || !connectionUri || !dbName) {
      return res
        .status(400)
        .json({ ok: false, error: 'All fields are required.' });
    }

    const integration = new Integration({
      tenantId,
      type: 'mongodb',
      connectionUri,
      dbName,
    });

    await integration.save();

    res.status(201).json({ ok: true, integration });
  } catch (err) {
    console.error('Integration Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * @route   GET /api/integration/:tenantId
 * @desc    Get integrations for a tenant
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const integrations = await Integration.find({
      tenantId: req.params.tenantId,
    });

    res.json({ ok: true, integrations });
  } catch (err) {
    console.error('Fetch Integration Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * @route   PUT /api/integration/:id
 * @desc    Update integration details
 */
router.put('/:id', async (req, res) => {
  try {
    const { connectionUri, dbName, status } = req.body;

    const integration = await Integration.findByIdAndUpdate(
      req.params.id,
      { connectionUri, dbName, status },
      { new: true }
    );

    if (!integration) {
      return res
        .status(404)
        .json({ ok: false, error: 'Integration not found' });
    }

    res.json({ ok: true, integration });
  } catch (err) {
    console.error('Update Integration Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * @route   DELETE /api/integration/:id
 * @desc    Remove integration
 */
router.delete('/:id', async (req, res) => {
  try {
    const integration = await Integration.findByIdAndDelete(req.params.id);

    if (!integration) {
      return res
        .status(404)
        .json({ ok: false, error: 'Integration not found' });
    }

    res.json({ ok: true, message: 'Integration removed' });
  } catch (err) {
    console.error('Delete Integration Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
