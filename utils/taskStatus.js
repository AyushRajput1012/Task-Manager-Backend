const INTERNAL_TASK_STATUSES = ['todo', 'in-progress', 'review', 'completed'];

// Frontend-friendly labels accepted by the API.
const UI_TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

const ALLOWED_TASK_STATUS_INPUTS = [...INTERNAL_TASK_STATUSES, ...UI_TASK_STATUSES];

const normalizeTaskStatus = (value) => {
  if (typeof value === 'undefined' || value === null) return null;

  // If the caller already provided an internal status, accept it.
  if (INTERNAL_TASK_STATUSES.includes(value)) return value;

  const normalized = String(value).trim().toLowerCase();

  // Accept a few common variants.
  if (normalized === 'pending') return 'todo';
  if (normalized === 'todo') return 'todo';

  if (normalized === 'in progress' || normalized === 'in-progress' || normalized === 'in_progress') {
    return 'in-progress';
  }

  if (normalized === 'review') return 'review';

  if (normalized === 'completed' || normalized === 'complete' || normalized === 'done') return 'completed';

  return null;
};

const toUiTaskStatus = (internalStatus) => {
  if (!internalStatus) return null;
  if (UI_TASK_STATUSES.includes(internalStatus)) return internalStatus;

  switch (internalStatus) {
    case 'todo':
      return 'Pending';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'review':
      // No dedicated UI column; treat as in progress.
      return 'In Progress';
    default:
      return null;
  }
};

module.exports = {
  INTERNAL_TASK_STATUSES,
  UI_TASK_STATUSES,
  ALLOWED_TASK_STATUS_INPUTS,
  normalizeTaskStatus,
  toUiTaskStatus
};
