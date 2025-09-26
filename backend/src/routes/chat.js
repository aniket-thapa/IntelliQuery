// src/routes/chat.js main chat route
import express from 'express';
import { buildAgent } from '../langgraph/agent.js';
import { authMiddleware } from '../middleware/auth.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// POST /api/chat
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res
        .status(400)
        .json({ status: false, error: 'Query is required' });
    }
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    if (!tenantId) {
      return res.status(400).json({
        status: false,
        error: 'Tenant is required',
      });
    }
    // Find the user's chat document, or create it if it doesn't exist
    let chatDoc = await Chat.findOne({ userId });
    if (!chatDoc) {
      chatDoc = new Chat({ tenantId, userId, messages: [] });
    }
    chatDoc.messages.push({ sender: 'user', text: query });
    await chatDoc.save();

    const recent = chatDoc.messages
      .slice(-10)
      .map((m) => ({ sender: m.sender, text: m.text }));

    // invoke agent
    const agent = buildAgent();
    const stateOut = await agent.invoke({
      tenantId,
      userQuery: query,
      recentMessages: recent,
    });

    const finalAnswer =
      stateOut.finalAnswer ?? (stateOut.result?.ok ? 'Done' : 'No result');
    const tableData = stateOut.tableData ?? null;
    const rows = stateOut.result?.rows ?? [];
    const mongoQuery = stateOut.mongoQuery ?? null;
    const schemaContext = stateOut.schemaContext ?? null;

    // append agent response
    chatDoc.messages.push({
      sender: 'agent',
      text: finalAnswer,
      data: {
        mongoQuery,
        schemaContext,
        rawResult: rows,
        tableData,
      },
    });
    await chatDoc.save();

    return res.json({
      status: true,
      finalAnswer,
      tableData,
      rows,
      mongoQuery,
      chatId: chatDoc._id,
    });
  } catch (err) {
    console.error('Chat route error:', err);
    return res.status(500).json({ status: false, error: err.message });
  }
});

// The paginated GET route to fetch chat messages
// GET /api/chat/messages?page=1&limit=20
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const chat = await Chat.findOne({ userId: req.user.id }).slice('messages', [
      -(page * limit),
      limit,
    ]);

    if (!chat) {
      // If no chat, return empty messages array
      return res.json({ ok: true, messages: [] });
    }

    res.json({ ok: true, messages: chat.messages.reverse() });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
