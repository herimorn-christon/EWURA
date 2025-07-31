import express from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticate } from '../middleware/auth.js';
import { validateCreateUser, validateUpdateUser, validateUUID } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management operations (Admin only)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 87436d99-0c93-49f7-9cd8-48223941a146
 *         deviceSerial:
 *           type: string
 *           example: ADV-ADMIN-001
 *         email:
 *           type: string
 *           format: email
 *           example: admin@advafuel.com
 *         username:
 *           type: string
 *           example: admin
 *         firstName:
 *           type: string
 *           example: System
 *         lastName:
 *           type: string
 *           example: Administrator
 *         phone:
 *           type: string
 *           example: +255754100300
 *         isActive:
 *           type: boolean
 *           example: true
 *         emailVerified:
 *           type: boolean
 *           example: true
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           example: 2025-07-23T14:25:17.038Z
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-07-23T12:29:40.709Z
 *         roleCode:
 *           type: string
 *           enum: [ADMIN, MANAGER, OPERATOR, VIEWER]
 *           example: ADMIN
 *         roleName:
 *           type: string
 *           example: System Administrator
 *         stationName:
 *           type: string
 *           example: ADVATECH FILLING STATION
 *         stationCode:
 *           type: string
 *           example: ADV001
 *         interfaceType:
 *           type: string
 *           example: NPGIS Interface
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - deviceSerial
 *         - password
 *         - firstName
 *         - lastName
 *         - phone
 *         - stationId
 *       properties:
 *         deviceSerial:
 *           type: string
 *           description: Unique device serial number
 *           example: ADV-OP-001
 *         email:
 *           type: string
 *           format: email
 *           description: User email (optional)
 *           example: operator@advafuel.com
 *         username:
 *           type: string
 *           description: Username (optional)
 *           example: operator1
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User password
 *           example: Operator123!
 *         firstName:
 *           type: string
 *           description: First name
 *           example: Jane
 *         lastName:
 *           type: string
 *           description: Last name
 *           example: Operator
 *         phone:
 *           type: string
 *           description: Phone number (required)
 *           example: +255754100301
 *         roleCode:
 *           type: string
 *           enum: [ADMIN, MANAGER, OPERATOR, VIEWER]
 *           description: User role
 *           example: OPERATOR
 *         stationId:
 *           type: string
 *           format: uuid
 *           description: Station ID (required)
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         interfaceTypeId:
 *           type: string
 *           format: uuid
 *           description: Interface type ID
 *           example: 550e8400-e29b-41d4-a716-446655440001
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: newemail@advafuel.com
 *         username:
 *           type: string
 *           example: newusername
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         phone:
 *           type: string
 *           example: +255754100302
 *         roleCode:
 *           type: string
 *           enum: [ADMIN, MANAGER, OPERATOR, VIEWER]
 *           description: User role (Admin only)
 *           example: MANAGER
 *         stationId:
 *           type: string
 *           format: uuid
 *           description: Station ID (Admin only)
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         interfaceTypeId:
 *           type: string
 *           format: uuid
 *           description: Interface type ID (Admin only)
 *           example: 550e8400-e29b-41d4-a716-446655440001
 *         isActive:
 *           type: boolean
 *           description: Account status (Admin only)
 *           example: true
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
 *     description: Retrieve a paginated list of all users with their details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: roleCode
 *         schema:
 *           type: string
 *           enum: [ADMIN, MANAGER, OPERATOR, VIEWER]
 *         description: Filter by user role
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, email, username, or device serial
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserResponse'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     pages:
 *                       type: integer
 *                       example: 1
 *       403:
 *         description: Only administrators can view all users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, UserController.getAllUsers);

/**
 * @swagger
 * /api/users/roles:
 *   get:
 *     tags: [Users]
 *     summary: Get all user roles (Admin only)
 *     description: Retrieve all available user roles with their permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                             example: ADMIN
 *                           name:
 *                             type: string
 *                             example: System Administrator
 *                           permissions:
 *                             type: array
 *                             items:
 *                               type: string
 *                           description:
 *                             type: string
 *                             example: Full system access
 */
router.get('/roles', authenticate, UserController.getUserRoles);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users (Admin only)
 *     description: Search users by name, email, username, or device serial
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (minimum 2 characters)
 *         example: admin
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Found 2 users matching "admin"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserResponse'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/search', authenticate, UserController.searchUsers);

/**
 * @swagger
 * /api/users/managers:
 *   get:
 *     tags: [Users]
 *     summary: Get all managers for EWURA registration
 *     description: Retrieve all users with MANAGER or ADMIN role for EWURA form dropdown
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Managers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     managers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           deviceSerial:
 *                             type: string
 *                             example: ADV-MGR-001
 *                           firstName:
 *                             type: string
 *                             example: John
 *                           lastName:
 *                             type: string
 *                             example: Manager
 *                           email:
 *                             type: string
 *                             example: manager@advafuel.com
 *                           phone:
 *                             type: string
 *                             example: +255754100301
 *                           roleCode:
 *                             type: string
 *                             example: MANAGER
 *                           stationName:
 *                             type: string
 *                             example: ADVATECH FILLING STATION
 *                           stationCode:
 *                             type: string
 *                             example: ADV001
 *                 message:
 *                   type: string
 *                   example: Found 3 managers
 */
router.get('/managers', authenticate, UserController.getManagers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Get a specific user by ID. Admins can view any user, regular users can only view their own profile.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *         example: 87436d99-0c93-49f7-9cd8-48223941a146
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *       403:
 *         description: You can only access your own profile
 *       404:
 *         description: User not found
 */
router.get('/:id', validateUUID('id'), authenticate, UserController.getUserById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create new user (Admin only)
 *     description: Create a new user account. Only administrators can create users.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *           examples:
 *             operator:
 *               summary: Create Operator
 *               value:
 *                 deviceSerial: ADV-OP-001
 *                 email: operator@advafuel.com
 *                 username: operator1
 *                 password: Operator123!
 *                 firstName: Jane
 *                 lastName: Operator
 *                 phone: +255754100301
 *                 roleCode: OPERATOR
 *             manager:
 *               summary: Create Manager
 *               value:
 *                 deviceSerial: ADV-MGR-002
 *                 email: manager@advafuel.com
 *                 username: manager1
 *                 password: Manager123!
 *                 firstName: John
 *                 lastName: Manager
 *                 phone: +255754100302
 *                 roleCode: MANAGER
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation error or invalid role code
 *       403:
 *         description: Only administrators can create users
 *       409:
 *         description: Device serial, email, or username already exists
 */
router.post('/', authenticate, validateCreateUser, UserController.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     description: Update user information. Admins can update any user, regular users can only update their own profile (excluding role, station, and status).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *           examples:
 *             profile_update:
 *               summary: Update Profile
 *               value:
 *                 firstName: John
 *                 lastName: Updated
 *                 phone: +255754100399
 *             admin_update:
 *               summary: Admin Update (includes role change)
 *               value:
 *                 firstName: John
 *                 lastName: Manager
 *                 roleCode: MANAGER
 *                 isActive: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: Email or username already in use
 */
router.put('/:id', validateUUID('id'), authenticate, validateUpdateUser, UserController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (Admin only)
 *     description: Delete a user account. Only administrators can delete users. Cannot delete own account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       400:
 *         description: You cannot delete your own account
 *       403:
 *         description: Only administrators can delete users
 *       404:
 *         description: User not found
 */
router.delete('/:id', validateUUID('id'), authenticate, UserController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/role:
 *   put:
 *     tags: [Users]
 *     summary: Update user role (Admin only)
 *     description: Change a user's role. Only administrators can change user roles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleCode
 *             properties:
 *               roleCode:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, OPERATOR, VIEWER]
 *                 description: New role code
 *                 example: MANAGER
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User role updated to MANAGER successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid role code
 *       403:
 *         description: Only administrators can change user roles
 *       404:
 *         description: User not found
 */
router.put('/:id/role', validateUUID('id'), authenticate, UserController.updateUserRole);

/**
 * @swagger
 * /api/users/{id}/status:
 *   put:
 *     tags: [Users]
 *     summary: Update user status (Admin only)
 *     description: Activate or deactivate a user account. Only administrators can change user status. Cannot deactivate own account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Account status
 *                 example: false
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User deactivated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: You cannot deactivate your own account
 *       403:
 *         description: Only administrators can change user status
 *       404:
 *         description: User not found
 */
router.put('/:id/status', validateUUID('id'), authenticate, UserController.updateUserStatus);

/**
 * @swagger
 * /api/users/{id}/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Reset user password (Admin only)
 *     description: Reset a user's password. Only administrators can reset user passwords.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: New password (minimum 6 characters)
 *                 example: NewPassword123!
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User password reset successfully
 *       400:
 *         description: New password must be at least 6 characters long
 *       403:
 *         description: Only administrators can reset user passwords
 *       404:
 *         description: User not found
 */
router.post('/:id/reset-password', validateUUID('id'), authenticate, UserController.resetUserPassword);

export default router;