// routes/search.js
import express from 'express';
import { searchSchemaVectors } from '../utils/vectorSearchService.js';

const router = express.Router();

router.post('/schema', async (req, res) => {
  try {
    const { tenantId, query, k } = req.body;

    if (!tenantId || !query) {
      return res
        .status(400)
        .json({ ok: false, error: 'tenantId and query are required' });
    }

    const result = await searchSchemaVectors(tenantId, query, k || 5);

    if (!result.ok) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Search route error:', err.message);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
