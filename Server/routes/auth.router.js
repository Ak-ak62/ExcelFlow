const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user.model');
const Otp = require('../models/otp.model');
const { generateToken } = require('../utils/jwt.util');
const { sendOtpEmail } = require('../utils/email.util');

const router = express.Router();

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// POST /api/users/signup
// Step 1: Register user (unverified), send OTP
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(409).json({ message: 'Username already taken' });
      }
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Create unverified user
    const user = new User({ username, email, password, isVerified: false });
    await user.save();

    // Generate and hash OTP
    const otp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // Delete any previous OTP for this email
    await Otp.deleteMany({ email });

    await Otp.create({ email, otpHash });

    await sendOtpEmail(email, otp, username);

    res.status(200).json({ message: 'OTP sent to your email. Please verify to complete registration.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/verify-otp
// Step 2: Verify OTP, activate account, return token
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please signup again.' });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Delete OTP after successful verification
    await Otp.deleteOne({ email });

    // Activate user
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = generateToken({ userId: user._id, username: user.username });

    res.status(200).json({
      message: 'Account verified successfully',
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    const otp = generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    await Otp.deleteMany({ email });
    await Otp.create({ email, otpHash });
    await sendOtpEmail(email, otp, user.username);

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Account not verified. Please check your email for OTP.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken({ userId: user._id, username: user.username });

    res.status(200).json({
      message: 'Login successful',
      token,
      expiresIn: '1h',
      user: { id: user._id, username: user.username }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// GET /api/users/check-username/:username
router.get('/check-username/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    res.status(200).json({ exists: !!user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/check-email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    res.status(200).json({ exists: !!user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;