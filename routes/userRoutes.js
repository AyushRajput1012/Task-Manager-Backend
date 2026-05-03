const express = require('express');
const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validate');
const {
	getUsers,
	updateMyProfile,
	getUserById,
	deactivateUser,
	updateUserRole
} = require('../controllers/userController');

const router = express.Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List all users (Admin only)
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
 *                 $ref: '#/components/schemas/UserListItem'
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
router.get(
	'/',
	protect,
	requireRole('admin'),
	[
		query('role').optional().isIn(['admin', 'member']).withMessage('role must be admin or member'),
		query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
		query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
	],
	validate,
	getUsers
);

router.put(
	'/profile/me',
	protect,
	[
		body('name').optional().isString(),
		body('avatar').optional().isString()
	],
	validate,
	updateMyProfile
);

router.get(
	'/:id',
	protect,
	[param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid user id')],
	validate,
	getUserById
);

router.delete(
	'/:id',
	protect,
	requireRole('admin'),
	[param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid user id')],
	validate,
	deactivateUser
);

router.put(
	'/:id/role',
	protect,
	requireRole('admin'),
	[
		param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('invalid user id'),
		body('role').isIn(['admin', 'member']).withMessage('role must be admin or member')
	],
	validate,
	updateUserRole
);

module.exports = router;
