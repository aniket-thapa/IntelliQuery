// src/routes/chat.js
import express from 'express';
import { buildAgent } from '../langgraph/agent.js';
import { authMiddleware } from '../middleware/auth.js';
import Chat from '../models/Chat.js';

const router = express.Router();

/**
 * POST /api/chat
 * Body: { tenantId, query, chatId?, sessionId }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tenantId, query, chatId, sessionId } = req.body;

    if (!tenantId || !query || !sessionId) {
      return res
        .status(400)
        .json({ ok: false, error: 'tenantId, query, and sessionId required' });
    }

    // 📝 Persist user message
    let chatDoc;
    if (chatId) {
      chatDoc = await Chat.findById(chatId);
      if (!chatDoc) {
        return res.status(404).json({ ok: false, error: 'Chat not found' });
      }
      chatDoc.messages.push({ sender: 'user', text: query });
      await chatDoc.save();
    } else {
      chatDoc = new Chat({
        tenantId,
        userId: req.user.id,
        sessionId,
        messages: [{ sender: 'user', text: query }],
      });
      await chatDoc.save();
    }

    // 🤖 Run Agent
    const agent = buildAgent();

    // fetch the chat doc to obtain history (if sessionId/chatId given)
    let recentMessages = [];

    if (chatDoc) {
      // map to simplified messages for context
      recentMessages = chatDoc.messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));
      // keep only last ~15 messages or char-limited via tokenUtils in agent
    }

    const stateOut = await agent.invoke({
      tenantId,
      userQuery: query,
      recentMessages,
    });

    const { schemaContext, mongoQuery, result } = stateOut;

    let agentReply;
    if (Array.isArray(result)) {
      agentReply = JSON.stringify(result, null, 2);
    } else if (result?.error) {
      agentReply = `⚠️ Error: ${result.error}`;
    } else {
      agentReply = 'No result';
    }

    // Append agent reply
    chatDoc.messages.push({
      sender: 'agent',
      text: agentReply,
      data: { schemaContext, mongoQuery, rawResult: result },
    });
    await chatDoc.save();

    // Return structured response
    return res.json({
      ok: true,
      chatId: chatDoc._id,
      schemaContext,
      mongoQuery,
      result,
    });
  } catch (err) {
    console.error('Chat route error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
