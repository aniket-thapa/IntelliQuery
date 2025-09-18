import express from 'express';
import { buildAgent } from '../langgraph/agent.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/test', authMiddleware, async (req, res) => {
  try {
    const { tenantId, query } = req.body;

    if (!tenantId || !query) {
      return res
        .status(400)
        .json({ ok: false, error: 'tenantId and query are required' });
    }

    const agent = buildAgent();
    const stateOut = await agent.invoke({ tenantId, userQuery: query });

    const { schemaContext, mongoQuery, result, finalAnswer } = stateOut;

    return res.json({
      ok: true,
      query,
      schemaContext,
      mongoQuery,
      result,
      finalAnswer, // 🟢 ready-to-show user-friendly response
    });
  } catch (err) {
    console.error('Chat Test Route Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
