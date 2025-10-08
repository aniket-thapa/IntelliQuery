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
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ status: false, error: 'User is not part of any tenant' });
    }

    const tenant = await Tenant.findById(tenantId).populate(
      'members',
      'name email role'
    );

    if (!tenant) {
      return res.status(404).json({ status: false, error: 'Tenant not found' });
    }

    const isOwner = tenant.ownerId.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: false,
        error: 'Access denied. Only the owner or an admin can view members.',
      });
    }

    res.json({ status: true, members: tenant.members });
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

    const user = await User.findOneAndUpdate(
      { _id: userId, tenantId: tenantId },
      { role },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        status: false,
        error: 'User not found in this tenant',
      });
    }
    res.json({ status: true, user });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// DELETE /api/user/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userIdToRemove = req.params.id;
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
    if (userIdToRemove.toString() === req.user.id.toString()) {
      return res
        .status(400)
        .json({ status: false, error: 'Owner cannot remove themselves' });
    }
    // Find the user to ensure they are in the correct tenant first
    const userToRemove = await User.findOne({
      _id: userIdToRemove,
      tenantId: tenantId,
    });
    if (!userToRemove) {
      return res
        .status(404)
        .json({ status: false, error: 'User not found in this tenant' });
    }

    // ✅ The Fix: Use a transaction to perform both updates atomically
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Remove the user's ID from the tenant's member list
      await Tenant.updateOne(
        { _id: tenantId },
        { $pull: { members: userIdToRemove } },
        { session }
      );

      // Step 2: Disassociate the tenant from the user (set tenantId to null)
      // This "removes" them without deleting their account.
      userToRemove.tenantId = null;
      await userToRemove.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.json({
        status: true,
        message: 'User removed from tenant successfully',
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error; // Let the outer catch handle it
    }
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

export default router;
