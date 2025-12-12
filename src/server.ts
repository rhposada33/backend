import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Load environment variables
dotenv.config();

// Import configuration
import { config } from './config/index.js';
import { swaggerOptions } from './config/swagger.js';

// Import middleware
import { errorHandler, NotFoundError } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { tenantResolver } from './middleware/tenantResolver.js';

// Import routes
import { apiRouter } from './api/routes.js';

// Create Express application
const app = express();

// Middleware: Security
app.use(helmet());

// Middleware: CORS
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Middleware: Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware: Request logging
app.use(requestLogger);

// Middleware: Tenant resolution (multi-tenant isolation)
app.use(tenantResolver);

// TODO: Initialize database connections
// app.use(await initializeDatabase());

// Serve Swagger spec as JSON (before Swagger UI middleware)
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.get('/docs/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger Documentation UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    url: '/docs/swagger.json',
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Sateliteyes Guard API Documentation',
}));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes (includes auth routes)
app.use(`${config.apiPrefix}/${config.apiVersion}`, apiRouter);

// Middleware: Global error handler (MUST BE LAST)
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.info(`🚀 Server is running on port ${PORT}`);
  console.info(`📍 Environment: ${config.nodeEnv}`);
  console.info(`🔒 Multi-tenant mode: ${config.enableMultiTenant}`);
});

export default app;
