const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

const getAccessibleProjectIds = async (userId) => {
  const projects = await Project.find({ teamMembers: userId }).select('_id');
  return projects.map((p) => p._id);
};

const populateTask = (query) =>
  query
    .populate('assignedTo', 'name email role')
    .populate({
      path: 'projectId',
      select: 'name description createdBy teamMembers',
      populate: [
        { path: 'createdBy', select: 'name email role' },
        { path: 'teamMembers', select: 'name email role' }
      ]
    });

// POST /api/tasks (Admin only)
const createTask = asyncHandler(async (req, res) => {
  const { title, description = '', status, assignedTo, projectId, deadline } = req.body;

  const project = await Project.findById(projectId).select('_id teamMembers');
  if (!project) {
    res.status(400);
    throw new Error('Invalid projectId');
  }

  const assignee = await User.findById(assignedTo).select('_id');
  if (!assignee) {
    res.status(400);
    throw new Error('Invalid assignedTo');
  }

  const assigneeInProject = project.teamMembers.some((m) => String(m) === String(assignee._id));
  if (!assigneeInProject) {
    res.status(400);
    throw new Error('assignedTo must be a member of the project team');
  }

  const task = await Task.create({
    title,
    description,
    status,
    assignedTo,
    projectId,
    deadline
  });

  const populated = await populateTask(Task.findById(task._id));
  res.status(201).json(populated);
});

// GET /api/tasks
const getTasks = asyncHandler(async (req, res) => {
  const accessibleProjectIds = await getAccessibleProjectIds(req.user._id);

  const filter = { projectId: { $in: accessibleProjectIds } };
  if (req.query.projectId) {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400);
      throw new Error('Invalid projectId');
    }

    const allowed = accessibleProjectIds.some((id) => String(id) === String(projectId));
    if (!allowed) {
      res.status(403);
      throw new Error('Forbidden');
    }
    filter.projectId = projectId;
  }

  const tasks = await populateTask(Task.find(filter).sort({ createdAt: -1 }));
  res.json(tasks);
});

// PUT /api/tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid task id');
  }

  const task = await Task.findById(id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const project = await Project.findOne({ _id: task.projectId, teamMembers: req.user._id }).select('_id teamMembers');
  if (!project) {
    res.status(403);
    throw new Error('Forbidden');
  }

  const isAdmin = req.user.role === 'Admin';

  const { title, description, status, assignedTo, deadline } = req.body;

  if (typeof title !== 'undefined' && isAdmin) task.title = title;
  if (typeof description !== 'undefined') task.description = description;
  if (typeof status !== 'undefined') task.status = status;
  if (typeof deadline !== 'undefined' && isAdmin) task.deadline = deadline;

  if (typeof assignedTo !== 'undefined') {
    if (!isAdmin) {
      res.status(403);
      throw new Error('Only Admin can change assignedTo');
    }
    const assignee = await User.findById(assignedTo).select('_id');
    if (!assignee) {
      res.status(400);
      throw new Error('Invalid assignedTo');
    }
    const inTeam = project.teamMembers.some((m) => String(m) === String(assignee._id));
    if (!inTeam) {
      res.status(400);
      throw new Error('assignedTo must be a member of the project team');
    }
    task.assignedTo = assignedTo;
  }

  await task.save();
  const populated = await populateTask(Task.findById(task._id));
  res.json(populated);
});

// DELETE /api/tasks/:id (Admin only)
const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid task id');
  }

  const task = await Task.findById(id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const allowed = await Project.exists({ _id: task.projectId, teamMembers: req.user._id });
  if (!allowed) {
    res.status(403);
    throw new Error('Forbidden');
  }

  await task.deleteOne();
  res.json({ message: 'Task deleted' });
});

module.exports = { createTask, getTasks, updateTask, deleteTask };
