const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

const populateTask = (query) =>
  query
    .populate('assignedTo', 'name email role avatar isActive')
    .populate('createdBy', 'name email role avatar isActive')
    .populate({
      path: 'project',
      select: 'name description owner members status deadline',
      populate: [
        { path: 'owner', select: 'name email role avatar isActive' },
        { path: 'members.user', select: 'name email role avatar isActive' }
      ]
    });

const getAccessibleProjectIds = async (userId) => {
  const projects = await Project.find({
    $or: [{ owner: userId }, { 'members.user': userId }]
  }).select('_id');
  return projects.map((p) => p._id);
};

const getProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId).select('owner members');
  if (!project) return { project: null, isMember: false, isAdmin: false };

  const isOwner = String(project.owner) === String(userId);
  const member = project.members.find((m) => String(m.user) === String(userId));
  const isMember = isOwner || Boolean(member);
  const isAdmin = isOwner || (member && member.role === 'admin');
  return { project, isMember, isAdmin };
};

// POST /api/tasks
const createTask = asyncHandler(async (req, res) => {
  const { title, description = '', projectId, assignedTo, priority, dueDate, tags = [] } = req.body;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400);
    throw new Error('Invalid projectId');
  }

  const { project, isMember } = await getProjectAccess(projectId, req.user._id);
  if (!project) {
    res.status(400);
    throw new Error('Invalid projectId');
  }

  if (!isMember && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not a project member');
  }

  let assigneeId = assignedTo || null;
  if (assigneeId) {
    if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
      res.status(400);
      throw new Error('Invalid assignedTo');
    }
    const assignee = await User.findById(assigneeId).select('_id');
    if (!assignee) {
      res.status(400);
      throw new Error('Invalid assignedTo');
    }
    const assigneeIsMember = project.members.some((m) => String(m.user) === String(assigneeId));
    if (!assigneeIsMember && String(project.owner) !== String(assigneeId)) {
      res.status(400);
      throw new Error('assignedTo must be a member of the project team');
    }
  }

  const task = await Task.create({
    title,
    description,
    project: projectId,
    assignedTo: assigneeId,
    createdBy: req.user._id,
    priority,
    dueDate: dueDate ? new Date(dueDate) : null,
    tags
  });

  const populated = await populateTask(Task.findById(task._id));
  res.status(201).json({ success: true, task: populated });
});

// GET /api/tasks
const getTasks = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);

  const filter = {};
  if (!isAdmin) {
    const accessibleProjectIds = await getAccessibleProjectIds(req.user._id);
    filter.project = { $in: accessibleProjectIds };
  }

  if (req.query.projectId) {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400);
      throw new Error('Invalid projectId');
    }

    if (!isAdmin) {
      const allowed = await Project.exists({
        _id: projectId,
        $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
      });
      if (!allowed) {
        res.status(403);
        throw new Error('Forbidden');
      }
    }

    filter.project = projectId;
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;

  if (req.query.assignedTo) {
    if (req.query.assignedTo === 'me') {
      filter.assignedTo = req.user._id;
    } else {
      if (!mongoose.Types.ObjectId.isValid(req.query.assignedTo)) {
        res.status(400);
        throw new Error('Invalid assignedTo');
      }
      filter.assignedTo = req.query.assignedTo;
    }
  }

  if (req.query.overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: 'completed' };
  }

  if (req.query.search) {
    const q = new RegExp(req.query.search, 'i');
    filter.$or = [{ title: q }, { description: q }];
  }

  const [total, tasks] = await Promise.all([
    Task.countDocuments(filter),
    populateTask(
      Task.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    )
  ]);

  res.json({ success: true, total, tasks });
});

// GET /api/tasks/:id
const getTaskById = asyncHandler(async (req, res) => {
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

  if (req.user.role !== 'admin') {
    const allowed = await Project.exists({
      _id: task.project,
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    });
    if (!allowed) {
      res.status(403);
      throw new Error('Access denied');
    }
  }

  const populated = await populateTask(Task.findById(task._id));
  res.json({ success: true, task: populated });
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

  const { project, isMember, isAdmin: isProjectAdmin } = await getProjectAccess(task.project, req.user._id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (!isMember && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Access denied');
  }

  const { title, description, status, assignedTo, priority, dueDate, tags } = req.body;

  if (typeof title !== 'undefined') task.title = title;
  if (typeof description !== 'undefined') task.description = description;
  if (typeof status !== 'undefined') task.status = status;
  if (typeof priority !== 'undefined') task.priority = priority;
  if (typeof dueDate !== 'undefined') task.dueDate = dueDate ? new Date(dueDate) : null;
  if (typeof tags !== 'undefined') task.tags = tags;

  if (typeof status !== 'undefined') {
    task.completedAt = status === 'completed' ? new Date() : null;
  }

  if (typeof assignedTo !== 'undefined') {
    if (!assignedTo) {
      task.assignedTo = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        res.status(400);
        throw new Error('Invalid assignedTo');
      }
      const assignee = await User.findById(assignedTo).select('_id');
      if (!assignee) {
        res.status(400);
        throw new Error('Invalid assignedTo');
      }
      const inTeam = project.members.some((m) => String(m.user) === String(assignee._id));
      if (!inTeam && String(project.owner) !== String(assignee._id)) {
        res.status(400);
        throw new Error('assignedTo must be a member of the project team');
      }
      task.assignedTo = assignedTo;
    }
  }

  if (typeof status !== 'undefined' && status === 'completed') {
    task.completedAt = new Date();
  }

  if (!isProjectAdmin && req.user.role !== 'admin') {
    if (typeof assignedTo !== 'undefined') {
      res.status(403);
      throw new Error('Access denied');
    }
  }

  await task.save();
  const populated = await populateTask(Task.findById(task._id));
  res.json({ success: true, task: populated });
});

// PATCH /api/tasks/:id/status
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error('Invalid task id');
  }

  const task = await Task.findById(id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  if (req.user.role !== 'admin') {
    const allowed = await Project.exists({
      _id: task.project,
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    });
    if (!allowed) {
      res.status(403);
      throw new Error('Access denied');
    }
  }

  task.status = status;
  task.completedAt = status === 'completed' ? new Date() : null;
  await task.save();

  const populated = await populateTask(Task.findById(task._id));
  res.json({ success: true, task: populated });
});

// DELETE /api/tasks/:id
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

  const project = await Project.findById(task.project).select('owner members');
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const isOwner = String(project.owner) === String(req.user._id);
  const member = project.members.find((m) => String(m.user) === String(req.user._id));
  const isProjectAdmin = isOwner || (member && member.role === 'admin');
  const isCreator = String(task.createdBy) === String(req.user._id);
  const isGlobalAdmin = req.user.role === 'admin';

  if (!isCreator && !isProjectAdmin && !isGlobalAdmin) {
    res.status(403);
    throw new Error('Access denied');
  }

  await task.deleteOne();
  res.json({ success: true, message: 'Task deleted' });
});

module.exports = { createTask, getTasks, getTaskById, updateTask, updateTaskStatus, deleteTask };
