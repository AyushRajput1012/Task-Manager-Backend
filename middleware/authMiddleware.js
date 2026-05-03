const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const asyncHandler = require('./asyncHandler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized, missing token');
  }

  const token = authHeader.split(' ')[1];
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    res.status(401);
    throw new Error('Not authorized, invalid token');
  }

  if (!decoded?.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
    res.status(401);
    throw new Error('Not authorized, invalid token payload');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error('Not authorized, user not found');
  }

  if (user.isActive === false) {
    res.status(401);
    throw new Error('Not authorized, user inactive');
  }

  req.user = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    isActive: user.isActive
  };

  next();
});

module.exports = { protect };
