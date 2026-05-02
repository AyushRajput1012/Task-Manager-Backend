const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

// GET /api/users (Admin only)
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('_id name email role createdAt updatedAt');
  res.json(users);
});

module.exports = { getUsers };
