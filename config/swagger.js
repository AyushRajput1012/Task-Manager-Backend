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
            role: { type: 'string', enum: ['Admin', 'Member'], example: 'Member' },
          },
        },
        UserListItem: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6639b7f1a8f2d8a1c1234567' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', example: 'jane@example.com' },
            role: { type: 'string', enum: ['Admin', 'Member'], example: 'Member' },
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
        DeleteResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Task deleted' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'],
});

module.exports = swaggerSpec;
