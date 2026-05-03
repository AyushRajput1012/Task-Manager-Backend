const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  addProjectMembers,
  removeProjectMember,
  deleteProject
} = require('../controllers/projectController');

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
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('description').optional().isString(),
    body('deadline').optional().isISO8601().withMessage('deadline must be an ISO8601 date')
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

/**
 * @openapi
 * /api/projects/{id}:
 *   put:
 *     tags:
 *       - Projects
 *     summary: Update a project (Admin only, owner only)
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
 *             $ref: '#/components/schemas/ProjectUpdateInput'
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.put(
  '/:id',
  protect,
  [
    param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid project id'),
    body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
    body('description').optional().isString(),
    body('status').optional().isIn(['active', 'completed', 'on-hold', 'archived']).withMessage('invalid status'),
    body('deadline').optional().isISO8601().withMessage('deadline must be an ISO8601 date')
  ],
  validate,
  updateProject
);

/**
 * @openapi
 * /api/projects/{id}/members:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Add team members to a project (Admin only, owner only)
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
 *             $ref: '#/components/schemas/ProjectMembersInput'
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.post(
  '/:id/members',
  protect,
  [
    param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid project id'),
    body('userId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid user id'),
    body('role').optional().isIn(['admin', 'member']).withMessage('role must be admin or member')
  ],
  validate,
  addProjectMembers
);

/**
 * @openapi
 * /api/projects/{id}/members/{userId}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Remove a team member from a project (Admin only, owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete(
  '/:id/members/:userId',
  protect,
  [
    param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid project id'),
    param('userId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid user id')
  ],
  validate,
  removeProjectMember
);

/**
 * @openapi
 * /api/projects/{id}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Delete a project (Admin only, owner only)
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
router.delete(
  '/:id',
  protect,
  [param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid project id')],
  validate,
  deleteProject
);

module.exports = router;
