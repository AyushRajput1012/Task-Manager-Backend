const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');

const populateProject = (query) =>
  query
    .populate('owner', 'name email role avatar isActive')
    .populate('members.user', 'name email role avatar isActive');

const isProjectMember = (project, userId) => {
  if (String(project.owner) === String(userId)) return true;
  return project.members.some((m) => String(m.user) === String(userId));
};

const isProjectAdmin = (project, userId) => {
  if (String(project.owner) === String(userId)) return true;
  return project.members.some((m) => String(m.user) === String(userId) && m.role === 'admin');
};

// POST /api/projects
const createProject = asyncHandler(async (req, res) => {
  const { name, description = '', deadline = null } = req.body;

  const project = await Project.create({
    name,
    description,
    owner: req.user._id,
    deadline: deadline ? new Date(deadline) : null,
    members: [{ user: req.user._id, role: 'admin', joinedAt: new Date() }]
  });

  const populated = await populateProject(Project.findById(project._id));
  res.status(201).json({ success: true, project: populated });
});

// GET /api/projects
const getProjects = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);

  const isAdmin = req.user.role === 'admin';
  const filters = [];

  if (!isAdmin) {
    filters.push({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    });
  }

  if (status) filters.push({ status });

  if (search) {
    const q = new RegExp(search, 'i');
    filters.push({ $or: [{ name: q }, { description: q }] });
  }

  const filter = filters.length ? { $and: filters } : {};

  const [total, projects] = await Promise.all([
    Project.countDocuments(filter),
    populateProject(
      Project.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    )
  ]);

  res.json({ success: true, total, projects });
});

// GET /api/projects/:id
const getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid project id');
  }

  const project = await populateProject(Project.findById(id));
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (!isProjectMember(project, req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Access denied');
  }

  const [totalTasks, byStatusRows] = await Promise.all([
    Task.countDocuments({ project: project._id }),
    Task.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const tasksByStatus = { todo: 0, 'in-progress': 0, review: 0, completed: 0 };
  for (const row of byStatusRows) {
    if (row && row._id && typeof row.count === 'number') tasksByStatus[row._id] = row.count;
  }

  res.json({
    success: true,
    project,
    stats: { totalTasks, tasksByStatus }
  });
});

// PUT /api/projects/:id
const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid project id');
  }

  const project = await Project.findById(id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const canEdit = isProjectAdmin(project, req.user._id) || req.user.role === 'admin';
  if (!canEdit) {
    res.status(403);
    throw new Error('Access denied');
  }

  const { name, description, status, deadline } = req.body;
  if (typeof name !== 'undefined') project.name = name;
  if (typeof description !== 'undefined') project.description = description;
  if (typeof status !== 'undefined') project.status = status;
  if (typeof deadline !== 'undefined') project.deadline = deadline ? new Date(deadline) : null;

  await project.save();
  const populated = await populateProject(Project.findById(project._id));
  res.json({ success: true, project: populated });
});

// POST /api/projects/:id/members
const addProjectMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid project id');
  }

  const project = await Project.findById(id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const canEdit = isProjectAdmin(project, req.user._id) || req.user.role === 'admin';
  if (!canEdit) {
    res.status(403);
    throw new Error('Access denied');
  }

  const { userId, role = 'member' } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400);
    throw new Error('Invalid userId');
  }

  const user = await User.findById(userId).select('_id');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (String(project.owner) === String(userId)) {
    res.status(409);
    throw new Error('User is already the project owner');
  }

  const alreadyMember = project.members.some((m) => String(m.user) === String(userId));
  if (alreadyMember) {
    res.status(409);
    throw new Error('Already a member');
  }

  project.members.push({ user: userId, role, joinedAt: new Date() });
  await project.save();

  const populated = await populateProject(Project.findById(project._id));
  res.json({ success: true, project: populated });
});

// DELETE /api/projects/:id/members/:userId
const removeProjectMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid project id');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400);
    throw new Error('Invalid user id');
  }

  const project = await Project.findById(id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const canEdit = isProjectAdmin(project, req.user._id) || req.user.role === 'admin';
  if (!canEdit) {
    res.status(403);
    throw new Error('Access denied');
  }

  if (String(project.owner) === String(userId)) {
    res.status(400);
    throw new Error('Cannot remove project owner');
  }

  const beforeCount = project.members.length;
  project.members = project.members.filter((m) => String(m.user) !== String(userId));
  if (project.members.length === beforeCount) {
    res.status(400);
    throw new Error('User is not a member of this project');
  }

  const remainingAssignedTasks = await Task.countDocuments({ project: project._id, assignedTo: userId });
  if (remainingAssignedTasks > 0) {
    res.status(400);
    throw new Error('Cannot remove member with assigned tasks. Reassign or delete their tasks first');
  }

  await project.save();
  const populated = await populateProject(Project.findById(project._id));
  res.json({ success: true, project: populated });
});

// DELETE /api/projects/:id
const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid project id');
  }

  const project = await Project.findById(id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (String(project.owner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Access denied');
  }

  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
  res.json({ success: true, message: 'Project deleted' });
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  addProjectMembers,
  removeProjectMember,
  deleteProject
};
