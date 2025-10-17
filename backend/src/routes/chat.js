// src/routes/chat.js main chat route
import express from 'express';
import { buildAgent } from '../langgraph/agent.js';
import { authMiddleware } from '../middleware/auth.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// POST /api/chat
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

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

    // Recent Messages
    const recent = chatDoc.messages.slice(-10).map((m) => ({
      sender: m.sender,
      text: m.sender === 'agent' ? m.data.mongoQuery : m.text,
    }));

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // invoke agent
    const agent = buildAgent();

    const stream = await agent.stream({
      tenantId,
      userQuery: query,
      recentMessages: recent,
    });

    let finalState = {};
    for await (const chunk of stream) {
      const stepName = Object.keys(chunk)[0];
      const stepOutput = chunk[stepName];

      // Send an update for each step
      res.write(
        `data: ${JSON.stringify({ step: stepName, data: stepOutput })}\n\n`
      );

      finalState = { ...finalState, ...stepOutput };
    }

    // Once the stream is finished, save the final agent response to the database
    const { finalAnswer, tableData, mongoQuery, schemaContext } = finalState;

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

    res.end(); // End the stream
  } catch (err) {
    console.error('Chat route error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
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
    const paginatedMessages = chat.messages.slice(start, end);

    res.json({ status: true, messages: paginatedMessages });
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

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res
        .status(400)
        .json({ status: false, error: 'Invalid message ID format' });
    } // Use the atomic $pull operator to remove the message directly in the database

    const updateResult = await Chat.updateOne(
      { userId },
      { $pull: { messages: { _id: new mongoose.Types.ObjectId(messageId) } } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({
        status: false,
        error: 'Message not found or you do not have permission to delete it',
      });
    }

    return res.json({ status: true, message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
});

export default router;
