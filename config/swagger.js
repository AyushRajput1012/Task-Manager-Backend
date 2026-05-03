const swaggerJSDoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Team Task Manager API',
      version: '1.0.0',
      description: 'Backend REST API for Team Task Manager.',
    },
    servers: [
      {
        url: 'https://task-manager-backend-production-295a.up.railway.app',
        description: 'Production (Railway)',
      },
      {
        url: 'http://localhost:5000',
        description: 'Local dev server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '6639b7f1a8f2d8a1c1234567' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', example: 'jane@example.com' },
            role: { type: 'string', enum: ['admin', 'member'], example: 'member' },
          },
        },
        UserListItem: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6639b7f1a8f2d8a1c1234567' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', example: 'jane@example.com' },
            role: { type: 'string', enum: ['admin', 'member'], example: 'member' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6639b8a6a8f2d8a1c1234567' },
            name: { type: 'string', example: 'Website Redesign' },
            description: { type: 'string', example: 'Refresh marketing site.' },
            createdBy: { $ref: '#/components/schemas/User' },
            teamMembers: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6639b9c9a8f2d8a1c1234567' },
            title: { type: 'string', example: 'Create wireframes' },
            description: { type: 'string', example: 'Home and pricing pages.' },
            status: { type: 'string', enum: ['Pending', 'In Progress', 'Completed'] },
            assignedTo: { $ref: '#/components/schemas/User' },
            projectId: { $ref: '#/components/schemas/Project' },
            deadline: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ProjectInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Website Redesign' },
            description: { type: 'string', example: 'Refresh marketing site.' },
            teamMembers: {
              type: 'array',
              items: { type: 'string', example: '6639b7f1a8f2d8a1c1234567' },
            },
          },
        },
        ProjectUpdateInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Website Redesign v2' },
            description: { type: 'string', example: 'Updated description.' },
          },
        },
        ProjectMembersInput: {
          type: 'object',
          required: ['teamMembers'],
          properties: {
            teamMembers: {
              type: 'array',
              items: { type: 'string', example: '6639b7f1a8f2d8a1c1234567' },
            },
          },
        },
        TaskInput: {
          type: 'object',
          required: ['title', 'assignedTo', 'projectId', 'deadline'],
          properties: {
            title: { type: 'string', example: 'Create wireframes' },
            description: { type: 'string', example: 'Home and pricing pages.' },
            status: { type: 'string', enum: ['Pending', 'In Progress', 'Completed'] },
            assignedTo: { type: 'string', example: '6639b7f1a8f2d8a1c1234567' },
            projectId: { type: 'string', example: '6639b8a6a8f2d8a1c1234567' },
            deadline: { type: 'string', format: 'date-time', example: '2026-05-10T12:00:00.000Z' },
          },
        },
        TaskUpdate: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['Pending', 'In Progress', 'Completed'] },
            assignedTo: { type: 'string' },
            deadline: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'valid email is required' },
                },
              },
            },
          },
        },
        DeleteResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Task deleted' },
          },
        },
        TaskDashboardResponse: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['mine', 'all'], example: 'mine' },
            total: { type: 'number', example: 12 },
            byStatus: {
              type: 'object',
              properties: {
                Pending: { type: 'number', example: 5 },
                'In Progress': { type: 'number', example: 4 },
                Completed: { type: 'number', example: 3 },
              },
              additionalProperties: false,
            },
            overdue: { type: 'number', example: 2 },
            overdueTasks: {
              type: 'array',
              items: { $ref: '#/components/schemas/Task' },
            },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'],
});

module.exports = swaggerSpec;
