const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validate');
const { createTask, getTasks, updateTask, deleteTask } = require('../controllers/taskController');

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
  requireRole('Admin'),
  [
    body('title').trim().notEmpty().withMessage('title is required'),
    body('description').optional().isString(),
    body('status').optional().isIn(['Pending', 'In Progress', 'Completed']).withMessage('invalid status'),
    body('assignedTo')
      .custom((v) => mongoose.Types.ObjectId.isValid(v))
      .withMessage('assignedTo must be a valid user id'),
    body('projectId')
      .custom((v) => mongoose.Types.ObjectId.isValid(v))
      .withMessage('projectId must be a valid project id'),
    body('deadline').isISO8601().withMessage('deadline must be an ISO8601 date')
  ],
  validate,
  createTask
);

router.get('/', protect, getTasks);

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
    body('status').optional().isIn(['Pending', 'In Progress', 'Completed']).withMessage('invalid status'),
    body('assignedTo').optional().custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid assignedTo'),
    body('projectId').custom((v) => typeof v === 'undefined').withMessage('projectId cannot be changed'),
    body('deadline').optional().isISO8601().withMessage('deadline must be an ISO8601 date')
  ],
  validate,
  updateTask
);

router.delete(
  '/:id',
  protect,
  requireRole('Admin'),
  [param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid task id')],
  validate,
  deleteTask
);

module.exports = router;
