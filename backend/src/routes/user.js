import express from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get my profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List members in my tenant
router.get('/members', authMiddleware, async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res.status(400).json({ error: 'User is not part of any tenant' });
    } else if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Access denied, only admin can view members' });
    }
    const members = await User.find({ tenantId: req.user.tenantId }).select(
      'name email role'
    );
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
