  const swaggerJsdoc = require('swagger-jsdoc');
  
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Team Task Manager API',
        version: '1.0.0',
        description: 'REST API for Team Task Manager — Authentication, Projects, Tasks, Dashboard with Role-Based Access Control. Deployed on Azure App Service (West India).',
        contact: {
          name: 'Sandeep Vashishtha',
          url: 'https://github.com/SandeepVashishtha/Team-Task-Manager-Backend',
        },
        license: { name: 'ISC' },
      },
      servers: [
        { url: 'https://task-manager-backend-production-295a.up.railway.app/api', description: 'Production (Railway)' },
        { url: 'http://localhost:5000/api', description: 'Development (local)' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token (from /auth/login)',
          },
        },
        schemas: {
          // ── User ──────────────────────────────────────────────────────────────
          User: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0e' },
              name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'john@example.com' },
              role: { type: 'string', enum: ['admin', 'member'], example: 'member' },
              avatar: { type: 'string', nullable: true },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          // ── Project ───────────────────────────────────────────────────────────
          Project: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string', example: 'Website Redesign' },
              description: { type: 'string', example: 'Full frontend overhaul' },
              owner: { $ref: '#/components/schemas/User' },
              members: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    role: { type: 'string', enum: ['admin', 'member'] },
                    joinedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              status: { type: 'string', enum: ['active', 'completed', 'on-hold', 'archived'] },
              deadline: { type: 'string', format: 'date-time', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          // ── Task ──────────────────────────────────────────────────────────────
          Task: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string', example: 'Design homepage mockup' },
              description: { type: 'string' },
              project: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' } } },
              assignedTo: { $ref: '#/components/schemas/User' },
              createdBy: { $ref: '#/components/schemas/User' },
              status: { type: 'string', enum: ['todo', 'in-progress', 'review', 'completed'] },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
              dueDate: { type: 'string', format: 'date-time', nullable: true },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              isOverdue: { type: 'boolean' },
              tags: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          // ── Common responses ──────────────────────────────────────────────────
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string', example: 'Error description' },
            },
          },
          ValidationError: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string', example: 'Validation failed' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      // Apply BearerAuth globally (can be overridden per route)
      security: [{ BearerAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Signup, Login, Profile' },
        { name: 'Users', description: 'User management (Admin)' },
        { name: 'Projects', description: 'Project & team management' },
        { name: 'Tasks', description: 'Task creation, assignment & tracking' },
        { name: 'Dashboard', description: 'Stats & overview' },
      ],
      paths: {
        // ════════════════════════════════════════════════════════════
        //  AUTH
        // ════════════════════════════════════════════════════════════
        '/auth/signup': {
          post: {
            tags: ['Auth'],
            summary: 'Register a new user',
            security: [],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                      name: { type: 'string', example: 'John Doe' },
                      email: { type: 'string', example: 'john@example.com' },
                      password: { type: 'string', example: 'secret123' },
                      role: { type: 'string', enum: ['admin', 'member'], example: 'member' },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'User created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        token: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
              400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
              409: { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
          },
        },
        '/auth/login': {
          post: {
            tags: ['Auth'],
            summary: 'Login and receive JWT token',
            security: [],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', example: 'john@example.com' },
                      password: { type: 'string', example: 'secret123' },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: 'Login successful',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
              401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
          },
        },
        '/auth/me': {
          get: {
            tags: ['Auth'],
            summary: 'Get current logged-in user',
            responses: {
              200: { description: 'Current user', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, user: { $ref: '#/components/schemas/User' } } } } } },
              401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
          },
        },
        '/auth/change-password': {
          put: {
            tags: ['Auth'],
            summary: 'Change own password',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['currentPassword', 'newPassword'],
                    properties: {
                      currentPassword: { type: 'string', example: 'oldpass123' },
                      newPassword: { type: 'string', example: 'newpass456' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Password changed', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },
              400: { description: 'Wrong current password', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
          },
        },
  
        // ════════════════════════════════════════════════════════════
        //  USERS
        // ════════════════════════════════════════════════════════════
        '/users': {
          get: {
            tags: ['Users'],
            summary: 'List all users (Admin only)',
            parameters: [
              { in: 'query', name: 'role', schema: { type: 'string', enum: ['admin', 'member'] } },
              { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search by name or email' },
              { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            ],
            responses: {
              200: {
                description: 'List of users',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        pages: { type: 'integer' },
                        users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                      },
                    },
                  },
                },
              },
              403: { description: 'Forbidden (not admin)' },
            },
          },
        },
        '/users/profile/me': {
          put: {
            tags: ['Users'],
            summary: 'Update own profile (name, avatar)',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Jane Doe' },
                      avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Updated user', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, user: { $ref: '#/components/schemas/User' } } } } } },
            },
          },
        },
        '/users/{id}': {
          get: {
            tags: ['Users'],
            summary: 'Get user by ID',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'User found', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, user: { $ref: '#/components/schemas/User' } } } } } },
              404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
          },
          delete: {
            tags: ['Users'],
            summary: 'Deactivate user (Admin only)',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'User deactivated' },
              403: { description: 'Forbidden' },
              404: { description: 'User not found' },
            },
          },
        },
        '/users/{id}/role': {
          put: {
            tags: ['Users'],
            summary: 'Update user role (Admin only)',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['role'],
                    properties: { role: { type: 'string', enum: ['admin', 'member'] } },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Role updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, user: { $ref: '#/components/schemas/User' } } } } } },
              403: { description: 'Forbidden' },
            },
          },
        },
  
        // ════════════════════════════════════════════════════════════
        //  PROJECTS
        // ════════════════════════════════════════════════════════════
        '/projects': {
          post: {
            tags: ['Projects'],
            summary: 'Create a new project',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                      name: { type: 'string', example: 'Website Redesign' },
                      description: { type: 'string', example: 'Full frontend overhaul' },
                      deadline: { type: 'string', format: 'date', example: '2024-12-31' },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: 'Project created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, project: { $ref: '#/components/schemas/Project' } } } } } },
              400: { description: 'Validation error' },
            },
          },
          get: {
            tags: ['Projects'],
            summary: 'List projects (admin=all, member=own)',
            parameters: [
              { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'completed', 'on-hold', 'archived'] } },
              { in: 'query', name: 'search', schema: { type: 'string' } },
              { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            ],
            responses: {
              200: {
                description: 'Projects list',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        total: { type: 'integer' },
                        projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/projects/{id}': {
          get: {
            tags: ['Projects'],
            summary: 'Get project details + task stats',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Project details with task stats' },
              403: { description: 'Access denied' },
              404: { description: 'Project not found' },
            },
          },
          put: {
            tags: ['Projects'],
            summary: 'Update project (project admin only)',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      status: { type: 'string', enum: ['active', 'completed', 'on-hold', 'archived'] },
                      deadline: { type: 'string', format: 'date' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Project updated' },
              403: { description: 'Access denied' },
            },
          },
          delete: {
            tags: ['Projects'],
            summary: 'Delete project + all its tasks (owner only)',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Project deleted' },
              403: { description: 'Access denied' },
            },
          },
        },
        '/projects/{id}/members': {
          post: {
            tags: ['Projects'],
            summary: 'Add a member to the project',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['userId'],
                    properties: {
                      userId: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0e' },
                      role: { type: 'string', enum: ['admin', 'member'], default: 'member' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Member added' },
              404: { description: 'User or project not found' },
              409: { description: 'Already a member' },
            },
          },
        },
        '/projects/{id}/members/{userId}': {
          delete: {
            tags: ['Projects'],
            summary: 'Remove a member from the project',
            parameters: [
              { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
              { in: 'path', name: 'userId', required: true, schema: { type: 'string' } },
            ],
            responses: {
              200: { description: 'Member removed' },
              400: { description: 'Cannot remove project owner' },
              403: { description: 'Access denied' },
            },
          },
        },
  
        // ════════════════════════════════════════════════════════════
        //  TASKS
        // ════════════════════════════════════════════════════════════
        '/tasks': {
          post: {
            tags: ['Tasks'],
            summary: 'Create a new task',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['title', 'projectId'],
                    properties: {
                      title: { type: 'string', example: 'Design homepage mockup' },
                      description: { type: 'string' },
                      projectId: { type: 'string', example: '664a1b2c3d4e5f6a7b8c9d0e' },
                      assignedTo: { type: 'string', nullable: true, example: '664a1b2c3d4e5f6a7b8c9d0f' },
                      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
                      dueDate: { type: 'string', format: 'date', example: '2024-11-30' },
                      tags: { type: 'array', items: { type: 'string' }, example: ['design', 'frontend'] },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: 'Task created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, task: { $ref: '#/components/schemas/Task' } } } } } },
              400: { description: 'Validation error or assignee not a project member' },
              403: { description: 'Not a project member' },
            },
          },
          get: {
            tags: ['Tasks'],
            summary: 'List tasks with filters',
            parameters: [
              { in: 'query', name: 'projectId', schema: { type: 'string' } },
              { in: 'query', name: 'status', schema: { type: 'string', enum: ['todo', 'in-progress', 'review', 'completed'] } },
              { in: 'query', name: 'priority', schema: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] } },
              { in: 'query', name: 'assignedTo', schema: { type: 'string' }, description: 'Use "me" for own tasks or a user ID' },
              { in: 'query', name: 'overdue', schema: { type: 'boolean' }, description: 'Filter overdue tasks' },
              { in: 'query', name: 'search', schema: { type: 'string' } },
              { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            ],
            responses: {
              200: {
                description: 'Task list',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        total: { type: 'integer' },
                        tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/tasks/{id}': {
          get: {
            tags: ['Tasks'],
            summary: 'Get task by ID',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Task details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, task: { $ref: '#/components/schemas/Task' } } } } } },
              404: { description: 'Task not found' },
            },
          },
          put: {
            tags: ['Tasks'],
            summary: 'Update task (full update)',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      assignedTo: { type: 'string', nullable: true },
                      status: { type: 'string', enum: ['todo', 'in-progress', 'review', 'completed'] },
                      priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                      dueDate: { type: 'string', format: 'date', nullable: true },
                      tags: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Task updated' },
              403: { description: 'Access denied' },
              404: { description: 'Task not found' },
            },
          },
          delete: {
            tags: ['Tasks'],
            summary: 'Delete task (creator / project admin / global admin)',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            responses: {
              200: { description: 'Task deleted' },
              403: { description: 'Access denied' },
            },
          },
        },
        '/tasks/{id}/status': {
          patch: {
            tags: ['Tasks'],
            summary: 'Update task status only (lightweight Kanban update)',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['status'],
                    properties: {
                      status: { type: 'string', enum: ['todo', 'in-progress', 'review', 'completed'] },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Status updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, task: { $ref: '#/components/schemas/Task' } } } } } },
              400: { description: 'Invalid status' },
              403: { description: 'Access denied' },
            },
          },
        },
  
        // ════════════════════════════════════════════════════════════
        //  DASHBOARD
        // ════════════════════════════════════════════════════════════
        '/dashboard': {
          get: {
            tags: ['Dashboard'],
            summary: 'Get dashboard stats (scoped to user role)',
            responses: {
              200: {
                description: 'Dashboard data',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        dashboard: {
                          type: 'object',
                          properties: {
                            overview: {
                              type: 'object',
                              properties: {
                                totalProjects: { type: 'integer' },
                                activeProjects: { type: 'integer' },
                                totalTasks: { type: 'integer' },
                                completedTasks: { type: 'integer' },
                                overdueTasks: { type: 'integer' },
                                myAssignedTasks: { type: 'integer' },
                                totalUsers: { type: 'integer', description: 'Admin only' },
                              },
                            },
                            tasksByStatus: {
                              type: 'object',
                              properties: {
                                todo: { type: 'integer' },
                                'in-progress': { type: 'integer' },
                                review: { type: 'integer' },
                                completed: { type: 'integer' },
                              },
                            },
                            tasksByPriority: {
                              type: 'object',
                              properties: {
                                low: { type: 'integer' },
                                medium: { type: 'integer' },
                                high: { type: 'integer' },
                                urgent: { type: 'integer' },
                              },
                            },
                            recentTasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                            upcomingDeadlines: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
  
        // Health
        '/health': {
          get: {
            tags: ['Auth'],
            summary: 'Health check',
            security: [],
            responses: {
              200: {
                description: 'API is running',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    apis: [], // Using inline paths above
  };
  
  const swaggerSpec = swaggerJsdoc(options);
  module.exports = swaggerSpec;
