// routes/search.js
import express from 'express';
import { searchSchemaVectors } from '../utils/vectorSearchService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/schema', authMiddleware, async (req, res) => {
  try {
    const { query, k } = req.body;
    const tenantId = req.user.tenantId;

    if (!tenantId || !query) {
      return res
        .status(400)
        .json({ status: false, error: 'tenantId and query are required' });
    }

    const result = await searchSchemaVectors(tenantId, query, k || 5);

    if (!result.ok) {
      return res.status(500).json({ status: false, result });
    }

    res.json({ status: false, result });
  } catch (err) {
    console.error('Search route error:', err.message);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
});

export default router;
