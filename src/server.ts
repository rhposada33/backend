import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import configuration
import { config } from './config/index.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
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

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use(`${config.apiPrefix}/${config.apiVersion}`, apiRouter);

// TODO: Add additional routes for authentication, webhooks, etc.

// Middleware: 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Middleware: Global error handler
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.info(`🚀 Server is running on port ${PORT}`);
  console.info(`📍 Environment: ${config.nodeEnv}`);
  console.info(`🔒 Multi-tenant mode: ${config.enableMultiTenant}`);
});

export default app;
