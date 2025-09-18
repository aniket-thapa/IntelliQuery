import express from 'express';
import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// Get current tenant details
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId).populate(
      'members',
      'name email role'
    );
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ tenant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invite user to tenant
router.post('/invite', authMiddleware, async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const tenantId = req.user.tenantId;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Only owner can invite
    if (tenant.ownerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Only owner can invite members' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name,
        email,
        passwordHash: 'TEMP',
        role,
      });
      await user.save();
    }

    // Generate invite token
    const inviteToken = jwt.sign(
      { userId: user._id, tenantId: tenant._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const inviteLink = `${process.env.APP_URL}/api/auth/accept-invite?token=${inviteToken}`;

    const mailResult = await sendEmail(email, 'invite', inviteLink);
    if (!mailResult.ok) {
      return res.status(500).json({ error: 'Failed to send invite email' });
    }

    res.json({ message: 'Invite sent successfully', inviteLink });
  } catch (err) {
    console.error('Invite error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
