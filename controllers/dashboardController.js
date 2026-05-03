const asyncHandler = require('../middleware/asyncHandler');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { normalizeTaskStatus, toUiTaskStatus } = require('../utils/taskStatus');

const populateTaskSummary = (query) =>
  query
    .populate('assignedTo', 'name email role avatar isActive')
    .populate('createdBy', 'name email role avatar isActive')
    .populate('project', 'name');

// GET /api/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';

  const projectFilter = isAdmin
    ? {}
    : { $or: [{ owner: req.user._id }, { 'members.user': req.user._id }] };

  const projects = await Project.find(projectFilter).select('_id status name');
  const projectIds = projects.map((p) => p._id);
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;

  const projectNameById = new Map(projects.map((p) => [String(p._id), p.name]));

  const taskFilter = isAdmin
    ? {}
    : projectIds.length
      ? { project: { $in: projectIds } }
      : { _id: { $exists: false } };

  const now = new Date();

  const [
    totalTasks,
    completedTasks,
    overdueTasks,
    myAssignedTasks,
    tasksByStatusRows,
    tasksByPriorityRows,
    recentTasks,
    upcomingDeadlines,
    totalUsers
  ] = await Promise.all([
    Task.countDocuments(taskFilter),
    Task.countDocuments({ ...taskFilter, status: 'completed' }),
    Task.countDocuments({
      ...taskFilter,
      status: { $ne: 'completed' },
      dueDate: { $lt: now }
    }),
    Task.countDocuments({ ...taskFilter, assignedTo: req.user._id }),
    Task.aggregate([
      { $match: taskFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Task.aggregate([
      { $match: taskFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),
    populateTaskSummary(
      Task.find(taskFilter).sort({ createdAt: -1 }).limit(10)
    ),
    populateTaskSummary(
      Task.find({
        ...taskFilter,
        status: { $ne: 'completed' },
        dueDate: { $gte: now }
      })
        .sort({ dueDate: 1 })
        .limit(10)
    ),
    isAdmin ? User.countDocuments({}) : Promise.resolve(undefined)
  ]);

  const tasksByStatus = { todo: 0, 'in-progress': 0, review: 0, completed: 0 };
  for (const row of tasksByStatusRows) {
    if (row && row._id && typeof row.count === 'number') tasksByStatus[row._id] = row.count;
  }

  // UI-friendly breakdown (handles both legacy UI statuses and current internal statuses)
  const pendingCount = (tasksByStatus.todo || 0) + (tasksByStatus.Pending || 0);
  const inProgressCount = (tasksByStatus['in-progress'] || 0) + (tasksByStatus['In Progress'] || 0);
  const completedCount = (tasksByStatus.completed || 0) + (tasksByStatus.Completed || 0);
  const tasksByUiStatus = {
    Pending: pendingCount,
    'In Progress': inProgressCount,
    Completed: completedCount
  };

  const tasksByPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
  for (const row of tasksByPriorityRows) {
    if (row && row._id && typeof row.count === 'number') tasksByPriority[row._id] = row.count;
  }

  const normalizeTaskSummary = (taskDoc) => {
    const task = typeof taskDoc?.toObject === 'function' ? taskDoc.toObject({ virtuals: true }) : taskDoc;

    // Legacy task docs might use projectId instead of project
    if (!task.project && task.projectId) {
      const pid = String(task.projectId);
      task.project = { _id: pid, name: projectNameById.get(pid) };
    }

    // Legacy task docs might use deadline instead of dueDate
    if (!task.dueDate && task.deadline) {
      task.dueDate = task.deadline;
    }

    const normalizedInternal = normalizeTaskStatus(task.status);
    const internal = normalizedInternal ?? task.status;
    task.statusLabel = toUiTaskStatus(internal) ?? task.status;

    return task;
  };

  const recentTasksNormalized = Array.isArray(recentTasks) ? recentTasks.map(normalizeTaskSummary) : [];
  const upcomingDeadlinesNormalized = Array.isArray(upcomingDeadlines)
    ? upcomingDeadlines.map(normalizeTaskSummary)
    : [];

  const overview = {
    totalProjects,
    activeProjects,
    totalTasks,
    completedTasks,
    overdueTasks,
    myAssignedTasks
  };

  if (typeof totalUsers === 'number') {
    overview.totalUsers = totalUsers;
  }

  res.json({
    success: true,
    dashboard: {
      overview,
      tasksByStatus,
      tasksByUiStatus,
      tasksByPriority,
      recentTasks: recentTasksNormalized,
      upcomingDeadlines: upcomingDeadlinesNormalized
    }
  });
});

module.exports = { getDashboard };
