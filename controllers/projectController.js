const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');

const ensureOwner = (project, userId, res) => {
  if (String(project.createdBy) !== String(userId)) {
    res.status(403);
    throw new Error('Forbidden');
  }
};

const populateProject = (query) =>
  query.populate('createdBy', 'name email role').populate('teamMembers', 'name email role');

// POST /api/projects (Admin only)
const createProject = asyncHandler(async (req, res) => {
  const { name, description = '', teamMembers = [] } = req.body;

  const memberIds = Array.isArray(teamMembers) ? teamMembers : [];
  const normalized = [...new Set(memberIds.map(String))];

  for (const id of normalized) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid teamMembers id');
    }
  }

  const creatorId = String(req.user._id);
  if (!normalized.includes(creatorId)) normalized.push(creatorId);

  const users = await User.find({ _id: { $in: normalized } }).select('_id');
  if (users.length !== normalized.length) {
    res.status(400);
    throw new Error('One or more teamMembers do not exist');
  }

  const project = await Project.create({
    name,
    description,
    createdBy: req.user._id,
    teamMembers: normalized
  });

  const populated = await populateProject(Project.findById(project._id));

  res.status(201).json(populated);
});

// GET /api/projects
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ teamMembers: req.user._id })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email role')
    .populate('teamMembers', 'name email role');
  res.json(projects);
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

  const isMember = project.teamMembers.some((m) => String(m._id || m) === String(req.user._id));
  if (!isMember) {
    res.status(403);
    throw new Error('Forbidden');
  }

  res.json(project);
});

// PUT /api/projects/:id (Admin only, owner only)
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

  ensureOwner(project, req.user._id, res);

  const { name, description } = req.body;
  if (typeof name !== 'undefined') project.name = name;
  if (typeof description !== 'undefined') project.description = description;

  await project.save();
  const populated = await populateProject(Project.findById(project._id));
  res.json(populated);
});

// POST /api/projects/:id/members (Admin only, owner only)
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

  ensureOwner(project, req.user._id, res);

  const { teamMembers = [] } = req.body;
  const memberIds = Array.isArray(teamMembers) ? teamMembers : [];
  const normalized = [...new Set(memberIds.map(String))];

  for (const memberId of normalized) {
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      res.status(400);
      throw new Error('Invalid teamMembers id');
    }
  }

  const users = await User.find({ _id: { $in: normalized } }).select('_id');
  if (users.length !== normalized.length) {
    res.status(400);
    throw new Error('One or more teamMembers do not exist');
  }

  const merged = new Set(project.teamMembers.map(String));
  merged.add(String(project.createdBy));
  for (const memberId of normalized) merged.add(String(memberId));

  project.teamMembers = Array.from(merged);
  await project.save();

  const populated = await populateProject(Project.findById(project._id));
  res.json(populated);
});

// DELETE /api/projects/:id/members/:userId (Admin only, owner only)
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

  ensureOwner(project, req.user._id, res);

  if (String(project.createdBy) === String(userId)) {
    res.status(400);
    throw new Error('Cannot remove project owner from teamMembers');
  }

  const before = project.teamMembers.map(String);
  const after = before.filter((m) => String(m) !== String(userId));
  if (after.length === before.length) {
    res.status(400);
    throw new Error('User is not a member of this project');
  }

  const remainingAssignedTasks = await Task.countDocuments({ projectId: project._id, assignedTo: userId });
  if (remainingAssignedTasks > 0) {
    res.status(400);
    throw new Error('Cannot remove member with assigned tasks. Reassign or delete their tasks first');
  }

  project.teamMembers = after;
  await project.save();

  const populated = await populateProject(Project.findById(project._id));
  res.json(populated);
});

// DELETE /api/projects/:id (Admin only, owner only)
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

  ensureOwner(project, req.user._id, res);

  await Task.deleteMany({ projectId: project._id });
  await project.deleteOne();
  res.json({ message: 'Project deleted' });
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
