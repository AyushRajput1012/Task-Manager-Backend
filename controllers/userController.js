const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

const toUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar ?? null,
  isActive: user.isActive,
  createdAt: user.createdAt
});

// GET /api/users (Admin only)
const getUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const q = new RegExp(search, 'i');
    filter.$or = [{ name: q }, { email: q }];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select('_id name email role avatar isActive createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
  ]);

  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    users: users.map(toUserPayload)
  });
});

// PUT /api/users/profile/me
const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (typeof name !== 'undefined') user.name = name;
  if (typeof avatar !== 'undefined') user.avatar = avatar;

  await user.save();
  res.json({ success: true, user: toUserPayload(user) });
});

// GET /api/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('_id name email role avatar isActive createdAt');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({ success: true, user: toUserPayload(user) });
});

// DELETE /api/users/:id (Admin only) - deactivate user
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isActive = false;
  await user.save();
  res.json({ success: true, message: 'User deactivated' });
});

// PUT /api/users/:id/role (Admin only)
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.role = role;
  await user.save();
  res.json({ success: true, user: toUserPayload(user) });
});

module.exports = { getUsers, updateMyProfile, getUserById, deactivateUser, updateUserRole };
