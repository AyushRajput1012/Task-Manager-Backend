const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error('Forbidden');
  }

  next();
};

module.exports = { requireRole };
