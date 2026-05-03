const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
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
  '/:id',
  protect,
  [param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id')],
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
router.put(
  '/:id',
  protect,
  [
    param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id'),
    body('title').optional().isString(),
    body('description').optional().isString(),
    body('status')
      .optional()
      .isIn(['todo', 'in-progress', 'review', 'completed'])
      .withMessage('invalid status'),
    body('assignedTo')
      .optional({ nullable: true })
      .custom((v) => v === null || mongoose.Types.ObjectId.isValid(v))
      .withMessage('invalid assignedTo'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('invalid priority'),
    body('dueDate').optional().isISO8601().withMessage('dueDate must be an ISO8601 date'),
    body('tags').optional().isArray().withMessage('tags must be an array'),
    body('tags.*').optional().isString().withMessage('tags must be strings')
  ],
  validate,
  updateTask
);

router.patch(
  '/:id/status',
  protect,
  [
    param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id'),
    body('status')
      .isIn(['todo', 'in-progress', 'review', 'completed'])
      .withMessage('invalid status')
  ],
  validate,
  updateTaskStatus
);

router.delete(
  '/:id',
  protect,
  [param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id')],
  validate,
  deleteTask
);

module.exports = router;
