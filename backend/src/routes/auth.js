// backend/src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
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

    const resetLink = `${process.env.APP_URL}/api/auth/reset-password?token=${resetToken}`;

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
  try {
    const { token, password, newPassword } = req.body;
    if (!token || !password)
      return res
        .status(400)
        .json({ status: false, error: 'Token and password required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    const tenantId = decoded.tenantId;
    if (!user)
      return res.status(404).json({ status: false, error: 'User not found' });

    if (user.passwordHash !== 'TEMP') {
      return res
        .status(400)
        .json({ status: false, error: 'Invite already accepted' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;
    user.tenantId = tenantId;
    await user.save();

    const tenant = await Tenant.findById(tenantId);
    if (!tenant)
      return res.status(404).json({ status: false, error: 'Tenant not found' });

    // Add member to tenant members if not already
    if (!tenant.members.includes(user._id)) {
      tenant.members.push(user._id);
      await tenant.save();
    }

    res.json({ status: true, message: 'Invite accepted, you can now login' });
  } catch (err) {
    res
      .status(400)
      .json({ status: false, error: 'Invalid or expired invite token' });
  }
});

export default router;
