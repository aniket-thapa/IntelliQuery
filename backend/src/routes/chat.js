// src/routes/chat.js main chat route
import express from 'express';
import { buildAgent } from '../langgraph/agent.js';
import { authMiddleware } from '../middleware/auth.js';
import Chat from '../models/Chat.js';
import mongoose from 'mongoose'; // <-- Import mongoose if not already

const router = express.Router();

// POST /api/chat (using GET with query param for EventSource)
router.get('/', authMiddleware, async (req, res) => {
  // Changed POST to GET for EventSource compatibility
  try {
    const { query } = req.query; // Get query from query params

    if (!query) {
      // Cannot send 400 status directly with EventSource, handle differently or validate before opening stream
      console.error('Chat route error: Query is required');
      res.status(400).end('Query is required'); // End connection with error status
      return;
    }
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    if (!tenantId) {
      console.error('Chat route error: Tenant is required');
      res.status(400).end('Tenant is required');
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
      // Get 10 previous messages
      sender: m.sender,
      // Simplify context for agent: send agent's query/summary, not full data object
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
    res.flushHeaders(); // Send headers immediately

    // invoke agent
    const agent = buildAgent();

    const abortController = new AbortController();
    req.on('close', () => {
      console.log('Client closed connection. Aborting agent...');
      abortController.abort();
    });

    const stream = await agent.stream({
      tenantId,
      userQuery: query,
      recentMessages: recentMessagesForAgent, // Use specifically fetched recent messages
    }, {
      signal: abortController.signal
    });

    let finalState = {};
    let lastSentStepData = null; // Keep track of the last data sent

    for await (const chunk of stream) {
      const stepName = Object.keys(chunk)[0];
      const stepOutput = chunk[stepName];

      // Send an update for each step
      const dataToSend = { step: stepName, data: stepOutput };
      res.write(`data: ${JSON.stringify(dataToSend)}\n\n`);
      lastSentStepData = dataToSend; // Update last sent data

      // Update the accumulating final state (in case needed after loop)
      // Merge stepOutput into finalState, handling potential nested objects if necessary
      Object.keys(stepOutput).forEach((key) => {
        finalState[key] = stepOutput[key];
      });
    }

    // --- FIX: Only save the final agent response ONCE ---
    const { finalAnswer, tableData, mongoQuery, schemaContext } = finalState;

    if (finalAnswer) {
      // Ensure there is something to save, use updateOne to avoid VersionError
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
      console.warn(
        'Agent stream finished but no finalAnswer found in finalState.'
      );
      // Optionally save an error message or handle this case
    }
    // --- END FIX ---

    // Send a final "close" event (optional, but good practice)
    res.write('event: close\ndata: Stream finished\n\n');

    res.end(); // End the stream explicitly after saving
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Abort' || err.message === 'Aborted' || (err.message && err.message.toLowerCase().includes('abort'))) {
      console.log('Agent execution aborted by client.');
      return;
    }
    console.error('Chat route error:', err);
    // Try to send an error event if headers haven't been fully sent
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    } else {
      // If headers are sent, try sending an error event via SSE
      res.write(
        `data: ${JSON.stringify({
          error: err.message || 'An internal error occurred',
        })}\n\n`
      );
      res.write('event: close\ndata: Stream finished with error\n\n');
      res.end(); // Ensure stream closure on error
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
