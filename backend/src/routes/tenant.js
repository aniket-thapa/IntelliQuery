// backend/src/routes/tenant.js
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
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
    if (!tenant)
      return res.status(404).json({ status: false, error: 'Tenant not found' });
    res.json({ status: true, tenant });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// Invite user to tenant
router.post('/invite', authMiddleware, async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const inviterId = req.user.id;
    const inviterName = req.user.name;
    const tenantId = req.user.tenantId;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ status: false, error: 'Tenant not found' });
    }

    // Authorization: Only owner can invite
    if (tenant.ownerId.toString() !== inviterId.toString()) {
      return res.status(403).json({
        status: false,
        error: 'Only the tenant owner can invite members',
      });
    }

    // Prevent inviting an existing member
    const existingUser = await User.findOne({ email });
    if (existingUser && tenant.members.includes(existingUser._id)) {
      return res.status(409).json({
        status: false,
        error: 'This user is already a member of the tenant.',
      });
    }

    // Prevent duplicate pending invitations
    const existingInvite = await Invitation.findOne({
      email,
      tenantId,
      status: 'pending',
    });
    if (existingInvite) {
      return res.status(409).json({
        status: false,
        error: 'An invitation has already been sent to this email address.',
      });
    }

    // --- Core Logic Change ---
    // 1. Generate a unique identifier for the JWT (JTI - JWT ID)
    const jti = randomUUID();

    // 2. Create the JWT. The payload is stateless and contains all necessary info.
    const inviteToken = jwt.sign(
      {
        tenantId: tenant._id,
        email,
        name,
        inviterName,
        role,
        jti,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 3. Create the Invitation document in the database
    const invitation = new Invitation({
      email,
      tenantId,
      role,
      invitedBy: inviterId,
      tokenIdentifier: jti,
    });
    await invitation.save();

    // 4. Send the email
    const inviteLink = `${process.env.APP_URL}/accept-invite?token=${inviteToken}`;
    await sendEmail(email, 'invite', inviteLink);

    res.status(200).json({
      status: true,
      message: 'Invite sent successfully',
      inviteLink,
    });
  } catch (err) {
    console.error('Invite error:', err.message);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});

export default router;
