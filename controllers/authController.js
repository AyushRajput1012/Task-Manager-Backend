const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

// POST /api/auth/signup
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role, adminSecret } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('Email already in use');
  }

  let finalRole = 'Member';

  // Bootstrap: first user becomes Admin (useful for fresh installs / demos)
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    finalRole = 'Admin';
  }

  if (role === 'Admin') {
    const requiredSecret = process.env.ADMIN_SIGNUP_SECRET;
    if (requiredSecret && adminSecret === requiredSecret) {
      finalRole = 'Admin';
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    role: finalRole
  });

  const token = signToken(user._id);
  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
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

  const ok = await user.matchPassword(password);
  if (!ok) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const token = signToken(user._id);
  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

module.exports = { signup, login };
