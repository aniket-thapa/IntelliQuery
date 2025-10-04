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

    const recent = chatDoc.messages.slice(-10).map((m) => ({
      sender: m.sender,
      text: m.sender === 'agent' ? m.data.mongoQuery : m.text,
    }));

    // invoke agent
    const agent = buildAgent();
    const stateOut = await agent.invoke({
      tenantId,
      userQuery: query,
      recentMessages: recent,
    });

    const finalAnswer =
      stateOut?.finalAnswer ||
      "I'm sorry, I couldn't process your request at this time.";
    const tableData = stateOut?.tableData ?? null;
    const mongoQuery = stateOut?.mongoQuery ?? null;
    const schemaContext = stateOut?.schemaContext ?? null;

    // append agent response
    chatDoc.messages.push({
      sender: 'agent',
      text:
        typeof finalAnswer === 'string'
          ? finalAnswer
          : JSON.stringify(finalAnswer),
      data: {
        mongoQuery,
        schemaContext,
        rawResult: tableData?.rows || null,
        tableData,
      },
    });
    await chatDoc.save();

    return res.json({ status: true, finalAnswer, tableData, mongoQuery });
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

    const chat = await Chat.findOne({ userId: req.user.id });

    if (!chat) {
      // If no chat, return empty messages array
      return res.json({ status: true, messages: [] });
    }
    // Slice messages in JS (get latest messages for pagination)
    const start = Math.max(chat.messages.length - page * limit, 0);
    const end = chat.messages.length - (page - 1) * limit;
    const paginatedMessages = chat.messages.slice(start, end).reverse();

    res.json({ status: true, messages: paginatedMessages.reverse() });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
});

// DELETE /api/chat/messages/:messageId
router.delete('/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find the user's chat document
    const chatDoc = await Chat.findOne({ userId });
    if (!chatDoc) {
      return res.status(404).json({ status: false, error: 'Chat not found' });
    }

    // Find the index of the message to delete
    const idx = chatDoc.messages.findIndex(
      (msg) => msg._id.toString() === messageId
    );
    if (idx === -1) {
      return res
        .status(404)
        .json({ status: false, error: 'Message not found' });
    }

    // Remove the message
    chatDoc.messages.splice(idx, 1);
    await chatDoc.save();

    return res.json({ status: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
});

export default router;
