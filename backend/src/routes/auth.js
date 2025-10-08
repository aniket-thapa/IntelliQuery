// backend/src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Invitation from '../models/Invitation.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, tenantName } = req.body;
    if (!name || !email || !password || !tenantName) {
      return res
        .status(400)
        .json({ status: false, error: 'Missing required fields' });
    }

    const exists = await User.findOne({ email });
    if (exists)
      return res
        .status(400)
        .json({ status: false, error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);

    const tenant = new Tenant({ name: tenantName });
    await tenant.save();

    // Create user as admin of tenant
    const user = new User({
      name,
      email,
      passwordHash: hash,
      role: 'admin',
      tenantId: tenant._id,
    });
    const savedUser = await user.save();

    // Set tenant owner + members
    tenant.ownerId = savedUser._id;
    tenant.members = [savedUser._id];
    await tenant.save();

    const token = jwt.sign(
      { id: savedUser._id, email: savedUser.email, tenantId: tenant._id },
      process.env.JWT_SECRET,
      { expiresIn: '3d' }
    );

    const userObj = savedUser.toObject();
    delete userObj.passwordHash;

    res.status(201).json({ status: true, token, user: userObj, tenant });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ status: false, error: 'Email and password required' });

    const userData = await User.findOne({ email });
    if (!userData)
      return res
        .status(401)
        .json({ status: false, error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, userData.passwordHash);
    if (!match)
      return res
        .status(401)
        .json({ status: false, error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: userData._id, email: userData.email, tenantId: userData.tenantId },
      process.env.JWT_SECRET,
      { expiresIn: '3d' }
    );

    const userObj = userData.toObject();
    delete userObj.passwordHash;

    res.json({ status: true, token, user: userObj });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// Request Password Reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ status: false, error: 'Email required' });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ status: false, error: 'User not found' });

    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    const mailResult = await sendEmail(email, 'reset', resetLink);
    if (!mailResult.ok) {
      return res
        .status(500)
        .json({ status: false, error: 'Failed to send reset email' });
    }

    res.json({ status: true, message: 'Password reset email sent' });
  } catch (err) {
    console.error('Reset request error:', err.message);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ status: false, error: 'Token and new password required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user)
      return res.status(404).json({ status: false, error: 'User not found' });

    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    await user.save();

    res.json({ status: true, message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err.message);
    res.status(400).json({ status: false, error: 'Invalid or expired token' });
  }
});

router.post('/accept-invite', async (req, res) => {
  const { token, password } = req.body;

  if (!token) {
    return res.status(400).json({ status: false, error: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email, name, tenantId, role, jti } = decoded;

    const invitation = await Invitation.findOne({ tokenIdentifier: jti });

    if (!invitation) {
      return res
        .status(400)
        .json({ status: false, error: 'Invalid invitation link.' });
    }
    if (invitation.status === 'accepted') {
      return res.status(400).json({
        status: false,
        error: 'This invitation has already been accepted.',
      });
    }

    const existingUser = await User.findOne({ email });

    // --- Core Logic Change (Using a Transaction for Atomicity) ---
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (existingUser) {
        return res.status(409).json({
          status: false,
          error:
            'This user is already a member of a tenant and cannot join a new one.',
        });
      } else {
        if (!password) {
          return res.status(400).json({
            status: false,
            error: 'Password is required.',
          });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, passwordHash, role, tenantId });
        await newUser.save({ session });

        const tenant = await Tenant.findById(tenantId).session(session);
        if (!tenant) throw new Error('Tenant not found.');

        tenant.members.push(newUser._id);
        await tenant.save({ session });
      }

      invitation.status = 'accepted';
      await invitation.save({ session });

      await session.commitTransaction();

      res.status(200).json({
        status: true,
        message: 'Success! You are now a member of the tenant.',
      });
    } catch (transactionError) {
      await session.abortTransaction();
      console.error('Invite acceptance transaction error:', transactionError);
      res
        .status(500)
        .json({ status: false, error: 'Could not process invitation.' });
    } finally {
      session.endSession();
    }
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res
        .status(400)
        .json({ status: false, error: 'This invitation link has expired.' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res
        .status(400)
        .json({ status: false, error: 'Invalid invitation link.' });
    }
    console.error('Accept invite error:', err.message);
    res
      .status(500)
      .json({ status: false, error: 'An unexpected error occurred.' });
  }
});

export default router;
