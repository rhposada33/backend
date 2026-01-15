/**
 * Swagger / OpenAPI Configuration
 * Defines the API specification for Swagger UI documentation
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sateliteyes Guard API',
      version: '1.0.0',
      description:
        'Multi-tenant SaaS backend API for Sateliteyes Guard - providing authentication, tenant management, camera management, and event tracking.',
      contact: {
        name: 'Sateliteyes Guard Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.satelitrack.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token required for protected endpoints',
        },
      },
      schemas: {
        // Auth Schemas
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'tenantId'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password (minimum 6 characters)',
              example: 'SecurePassword123',
            },
            tenantId: {
              type: 'string',
              description: 'ID of the tenant to register with',
              example: 'tenant-uuid-1234',
            },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'User registered successfully',
            },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'user-uuid-1234' },
                email: { type: 'string', example: 'user@example.com' },
                tenantId: { type: 'string', example: 'tenant-uuid-1234' },
                role: { type: 'string', enum: ['ADMIN', 'CLIENT'], example: 'CLIENT' },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-12-12T10:30:00Z',
                },
              },
            },
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'SecurePassword123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Login successful',
            },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'user-uuid-1234' },
                email: { type: 'string', example: 'user@example.com' },
                tenantId: { type: 'string', example: 'tenant-uuid-1234' },
                role: { type: 'string', enum: ['ADMIN', 'CLIENT'], example: 'CLIENT' },
              },
            },
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },

        // Tenant Schemas
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique tenant identifier',
              example: 'tenant-uuid-1234',
            },
            name: {
              type: 'string',
              description: 'Tenant organization name',
              example: 'ACME Corporation',
            },
            description: {
              type: 'string',
              description: 'Tenant description',
              example: 'A leading provider of security solutions',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
              example: '2025-12-12T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2025-12-12T10:30:00Z',
            },
          },
        },
        CreateTenantRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: 'Tenant organization name',
              example: 'ACME Corporation',
            },
            description: {
              type: 'string',
              description: 'Optional tenant description',
              example: 'A leading provider of security solutions',
            },
          },
        },
        TenantListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Tenant' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 50 },
                totalPages: { type: 'integer', example: 5 },
              },
            },
          },
        },

        // Camera Schemas
        Camera: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique camera identifier',
              example: 'camera-uuid-5678',
            },
            key: {
              type: 'string',
              description: 'Unique key for the camera',
              example: 'webcam-kitchen',
            },
            label: {
              type: 'string',
              description: 'Display label for the camera',
              example: 'Kitchen Camera',
            },
            tenantId: {
              type: 'string',
              description: 'ID of the tenant that owns this camera',
              example: 'tenant-uuid-1234',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-12T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-12T10:30:00Z',
            },
          },
        },
        CreateCameraRequest: {
          type: 'object',
          required: ['key', 'label'],
          properties: {
            key: {
              type: 'string',
              description: 'Unique key for the camera',
              example: 'webcam-kitchen',
            },
            label: {
              type: 'string',
              description: 'Display label for the camera',
              example: 'Kitchen Camera',
            },
          },
        },
        UpdateCameraRequest: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Unique key for the camera',
              example: 'webcam-kitchen-v2',
            },
            label: {
              type: 'string',
              description: 'Display label for the camera',
              example: 'Kitchen Camera (Updated)',
            },
          },
        },
        CameraListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Camera' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 50 },
                total: { type: 'integer', example: 150 },
                totalPages: { type: 'integer', example: 3 },
              },
            },
          },
        },

        // Event Schemas
        Event: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique event identifier',
              example: 'event-uuid-9012',
            },
            cameraId: {
              type: 'string',
              description: 'ID of the camera that detected the event',
              example: 'camera-uuid-5678',
            },
            tenantId: {
              type: 'string',
              description: 'ID of the tenant that owns this event',
              example: 'tenant-uuid-1234',
            },
            type: {
              type: 'string',
              enum: ['motion', 'object_detection', 'person', 'car', 'animal'],
              description: 'Type of event detected',
              example: 'person',
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Event severity level',
              example: 'high',
            },
            description: {
              type: 'string',
              description: 'Event description',
              example: 'Person detected in kitchen area',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'When the event occurred',
              example: '2025-12-12T10:30:00Z',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL to event snapshot image',
              example: 'https://api.satelitrack.com/images/event-9012.jpg',
            },
            videoUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL to event video clip',
              example: 'https://api.satelitrack.com/videos/event-9012.mp4',
            },
            processed: {
              type: 'boolean',
              description: 'Whether the event has been processed',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-12T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-12T10:30:00Z',
            },
          },
        },
        EventListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Event' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 50 },
                total: { type: 'integer', example: 1250 },
                totalPages: { type: 'integer', example: 25 },
              },
            },
          },
        },

        // Error Schemas
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
              example: 'Bad Request',
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid pagination parameters',
            },
          },
        },
        UnauthorizedError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Unauthorized',
            },
            message: {
              type: 'string',
              example: 'Missing or invalid JWT token',
            },
          },
        },
        ForbiddenError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Forbidden',
            },
            message: {
              type: 'string',
              example: 'Only administrators can perform this action',
            },
          },
        },
        NotFoundError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Not Found',
            },
            message: {
              type: 'string',
              example: 'Resource not found',
            },
          },
        },
      },
    },
  },
  apis: [
    // Point to compiled JS files since swagger-jsdoc processes comments from the files
    join(__dirname, '../modules/user/router.js'),
    join(__dirname, '../modules/tenant/router.js'),
    join(__dirname, '../modules/camera/router.js'),
    join(__dirname, '../modules/event/router.js'),
  ],
};
