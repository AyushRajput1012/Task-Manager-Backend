const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validate');
const { createProject, getProjects, getProjectById } = require('../controllers/projectController');

const router = express.Router();

/**
 * @openapi
 * /api/projects:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Create a project (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
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
 *       - Projects
 *     summary: List projects for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
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
    body('name').trim().notEmpty().withMessage('name is required'),
    body('description').optional().isString(),
    body('teamMembers').optional().isArray().withMessage('teamMembers must be an array'),
    body('teamMembers.*')
      .optional()
      .custom((v) => mongoose.Types.ObjectId.isValid(v))
      .withMessage('teamMembers must contain valid user ids')
  ],
  validate,
  createProject
);

router.get('/', protect, getProjects);

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get a project by id
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
 *               $ref: '#/components/schemas/Project'
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
router.get(
  '/:id',
  protect,
  [param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid project id')],
  validate,
  getProjectById
);

module.exports = router;
