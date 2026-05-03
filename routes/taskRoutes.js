const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { normalizeTaskStatus, ALLOWED_TASK_STATUS_INPUTS } = require('../utils/taskStatus');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask
} = require('../controllers/taskController');

const router = express.Router();

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create a task (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskInput'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags:
 *       - Tasks
 *     summary: List tasks for accessible projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter tasks by project id
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid projectId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('title is required'),
    body('description').optional().isString(),
    body('projectId')
      .custom((v) => mongoose.Types.ObjectId.isValid(v))
      .withMessage('projectId must be a valid project id'),
    body('assignedTo')
      .optional({ nullable: true })
      .custom((v) => v === null || mongoose.Types.ObjectId.isValid(v))
      .withMessage('assignedTo must be a valid user id'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('invalid priority'),
    body('dueDate').optional().isISO8601().withMessage('dueDate must be an ISO8601 date'),
    body('tags').optional().isArray().withMessage('tags must be an array'),
    body('tags.*').optional().isString().withMessage('tags must be strings')
  ],
  validate,
  createTask
);

router.get('/', protect, getTasks);

/**
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get a task by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get(
  '/:taskId',
  protect,
  [param('taskId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id')],
  validate,
  getTaskById
);

/**
 * @openapi
 * /api/tasks/{id}:
 *   put:
 *     tags:
 *       - Tasks
 *     summary: Update a task
 *     description: Admin can update title, deadline, assignedTo. Members can update description and status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskUpdate'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Delete a task (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteResponse'
 *       400:
 *         description: Invalid id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
const updateTaskValidators = [
  param('taskId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id'),
  body('title').optional().trim().notEmpty().withMessage('title cannot be empty'),
  body('description').optional().isString(),
  body('status')
    .optional()
    .custom((v) => normalizeTaskStatus(v) !== null)
    .withMessage(`invalid status. Allowed values: ${ALLOWED_TASK_STATUS_INPUTS.join(', ')}`),
  body('assignedTo')
    .optional({ nullable: true })
    .custom((v) => v === null || mongoose.Types.ObjectId.isValid(v))
    .withMessage('invalid assignedTo'),
  body('projectId')
    .optional()
    .custom((v) => mongoose.Types.ObjectId.isValid(v))
    .withMessage('invalid projectId'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('invalid priority'),
  // Support both names: dueDate (existing) and deadline (frontend wording)
  body('dueDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('dueDate must be an ISO8601 date'),
  body('deadline')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('deadline must be an ISO8601 date'),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('tags.*').optional().isString().withMessage('tags must be strings')
];

router.put(
  '/:taskId',
  protect,
  updateTaskValidators,
  validate,
  updateTask
);

// Preferred: partial update
router.patch(
  '/:taskId',
  protect,
  updateTaskValidators,
  validate,
  updateTask
);

router.patch(
  '/:taskId/status',
  protect,
  [
    param('taskId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id'),
    body('status')
      .custom((v) => normalizeTaskStatus(v) !== null)
      .withMessage(`invalid status. Allowed values: ${ALLOWED_TASK_STATUS_INPUTS.join(', ')}`)
  ],
  validate,
  updateTaskStatus
);

router.delete(
  '/:taskId',
  protect,
  [param('taskId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id')],
  validate,
  deleteTask
);

module.exports = router;
