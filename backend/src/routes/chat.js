// src/routes/chat.js main chat route
import express from 'express';
import { buildAgent } from '../langgraph/agent.js';
import { authMiddleware } from '../middleware/auth.js';
import Chat from '../models/Chat.js';
import mongoose from 'mongoose'; // <-- Import mongoose if not already

const router = express.Router();

// POST /api/chat (using GET with query param for EventSource)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      console.error('Chat route error: Query is required');
      res.status(400).json({ error: 'Query is required' });
      return;
    }
    
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    
    if (!tenantId) {
      console.error('Chat route error: Tenant is required');
      res.status(400).json({ error: 'Tenant is required' });
      return;
    }

    // Atomically find, create if not exists, and push the new message
    const chatDoc = await Chat.findOneAndUpdate(
      { userId },
      { 
        $setOnInsert: { tenantId, userId },
        $push: { messages: { sender: 'user', text: query } }
      },
      { upsert: true, new: true }
    );

    // Recent Messages (Fetch last 10 BEFORE the current user message was added)
    const recentMessagesForAgent = chatDoc.messages.slice(-11, -1).map((m) => ({
      sender: m.sender,
      text:
        m.sender === 'agent'
          ? m.data?.mongoQuery
            ? `Generated query: ${JSON.stringify(m.data.mongoQuery)}`
            : m.text
          : m.text,
    }));

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); 

    // Invoke agent
    const agent = buildAgent();
    const abortController = new AbortController();
    
    req.on('close', () => {
      console.log('Client closed connection. Aborting agent...');
      abortController.abort();
    });

    const stream = await agent.stream({
      tenantId,
      userQuery: query,
      recentMessages: recentMessagesForAgent,
    }, {
      signal: abortController.signal
    });

    // Safely track the final results generated from various steps
    let finalAnswer = null;
    let tableData = null;
    let mongoQuery = null;

    for await (const chunk of stream) {
      const stepName = Object.keys(chunk)[0];
      const stepOutput = chunk[stepName];

      const dataToSend = { step: stepName, data: stepOutput };
      res.write(`data: ${JSON.stringify(dataToSend)}\n\n`);

      // Safely extract properties if they appear in this step
      if (stepOutput.finalAnswer !== undefined) finalAnswer = stepOutput.finalAnswer;
      if (stepOutput.tableData !== undefined) tableData = stepOutput.tableData;
      if (stepOutput.mongoQuery !== undefined) mongoQuery = stepOutput.mongoQuery;
    }

    // Only save the final agent response ONCE if we produced an answer
    if (finalAnswer) {
      await Chat.updateOne(
        { userId },
        {
          $push: {
            messages: {
              sender: 'agent',
              text: typeof finalAnswer === 'string' ? finalAnswer : JSON.stringify(finalAnswer),
              data: {
                mongoQuery: mongoQuery || null,
                rawResult: tableData?.rows || null,
                tableData: tableData || null,
              }
            }
          }
        }
      );
    } else {
      console.warn('Agent stream finished but no finalAnswer found in output.');
      await Chat.updateOne(
        { userId },
        {
          $push: {
            messages: {
              sender: 'agent',
              text: "I'm sorry, I couldn't generate a response for that. Please try again.",
              data: null
            }
          }
        }
      );
    }

    // Send a standard DONE event
    res.write('data: [DONE]\n\n');
    res.end(); 
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Abort' || err.message === 'Aborted' || (err.message && err.message.toLowerCase().includes('abort'))) {
      console.log('Agent execution aborted by client.');
      return;
    }
    
    console.error('Chat route error:', err);
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message || 'An internal error occurred' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// The paginated GET route to fetch chat messages
// GET /api/chat/messages?page=1&limit=20
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const chat = await Chat.findOne({ userId: req.user.id });

    if (!chat || chat.messages.length === 0) {
      // If no chat or no messages, return empty
      return res.json({ status: true, messages: [], hasMore: false });
    }

    // Calculate pagination slice indices for fetching *older* messages
    const totalMessages = chat.messages.length;
    const startIndex = Math.max(totalMessages - pageNum * limitNum, 0);
    const endIndex = totalMessages - (pageNum - 1) * limitNum;

    if (endIndex <= 0) {
      return res.json({ status: true, messages: [], hasMore: false });
    }

    // Slice messages in JS (get older messages for pagination)
    const paginatedMessages = chat.messages.slice(startIndex, endIndex);
    const hasMore = startIndex > 0; // Check if there are messages before the startIndex

    res.json({ status: true, messages: paginatedMessages, hasMore }); // Return hasMore flag
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
