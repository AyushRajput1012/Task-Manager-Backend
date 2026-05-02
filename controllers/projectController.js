const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Project = require('../models/Project');
const User = require('../models/User');

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

  const populated = await Project.findById(project._id)
    .populate('createdBy', 'name email role')
    .populate('teamMembers', 'name email role');

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

  const project = await Project.findById(id)
    .populate('createdBy', 'name email role')
    .populate('teamMembers', 'name email role');

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

module.exports = { createProject, getProjects, getProjectById };
