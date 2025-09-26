// backend/src/routes/user.js
import express from 'express';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get my profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user)
      return res.status(404).json({ status: false, error: 'User not found' });
    res.json({ status: true, user });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// List members in my tenant
router.get('/members', authMiddleware, async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res
        .status(400)
        .json({ status: false, error: 'User is not part of any tenant' });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: false,
        error: 'Access denied, only admin can view members',
      });
    }
    const members = await User.find({ tenantId: req.user.tenantId }).select(
      'name email role'
    );
    res.json({ status: true, members });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// PUT /api/user/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['member', 'admin'].includes(role)) {
      return res
        .status(400)
        .json({ status: false, error: 'Invalid role provided' });
    }
    const userId = req.params.id;
    const tenantId = req.user.tenantId;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant)
      return res.status(404).json({ status: false, error: 'Tenant not found' });
    // Only owner can remove
    if (tenant.ownerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        status: false,
        error: 'Only owner can update user role',
      });
    }
    if (userId.toString() === req.user.id.toString()) {
      return res
        .status(400)
        .json({ status: false, error: 'Owner cannot update his own role' });
    }
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user)
      return res.status(404).json({ status: false, error: 'User not found' });
    res.json({ status: true, user });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// DELETE /api/user/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const tenantId = req.user.tenantId;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant)
      return res.status(404).json({ status: false, error: 'Tenant not found' });
    // Only owner can remove
    if (tenant.ownerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        status: false,
        error: 'Only owner can remove members',
      });
    }
    if (userId.toString() === req.user.id.toString()) {
      return res
        .status(400)
        .json({ status: false, error: 'Owner cannot remove themselves' });
    }
    const user = await User.findByIdAndDelete(userId);
    if (!user)
      return res.status(404).json({ status: false, error: 'User not found' });

    await Tenant.updateOne(
      { _id: user.tenantId },
      { $pull: { members: user._id } }
    );

    res.json({ status: true, message: 'User removed' });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

export default router;
