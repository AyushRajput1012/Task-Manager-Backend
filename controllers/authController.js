const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

const toUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar ?? null,
  isActive: user.isActive,
  createdAt: user.createdAt
});

// POST /api/auth/signup
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('Email already in use');
  }

  let finalRole = role || 'member';

  // Bootstrap: if no role was provided, first user becomes admin.
  // (If role is provided, honor it.)
  if (!role) {
    const userCount = await User.countDocuments();
    if (userCount === 0) finalRole = 'admin';
  }

  const user = await User.create({
    name,
    email,
    password,
    role: finalRole
  });

  const token = signToken(user._id);
  res.status(201).json({
    success: true,
    token,
    user: toUserPayload(user)
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  if (user.isActive === false) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const ok = await user.matchPassword(password);
  if (!ok) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const token = signToken(user._id);
  res.json({
    success: true,
    token,
    user: toUserPayload(user)
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  res.json({ success: true, user: toUserPayload(user) });
});

// PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const ok = await user.matchPassword(currentPassword);
  if (!ok) {
    res.status(400);
    throw new Error('Wrong current password');
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed' });
});

module.exports = { signup, login, getMe, changePassword };
