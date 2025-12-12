import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Initialize Express Server
 * Multi-tenant SaaS backend for Sateliteyes Guard
 */

// Wrap in async IIFE to use top-level await
(async () => {
  try {
    // ============================================================================
    // 1. LOAD ENVIRONMENT CONFIGURATION
    // ============================================================================
    dotenv.config();

  const { config } = await import('./config/index.js');
  const { swaggerOptions } = await import('./config/swagger.js');

  console.log('📋 Configuration loaded');
  console.log(`   Node Environment: ${config.nodeEnv}`);
  console.log(`   API Prefix: ${config.apiPrefix}/${config.apiVersion}`);
  console.log(`   Multi-tenant mode: ${config.enableMultiTenant}`);

  // ============================================================================
  // 2. INITIALIZE DATABASE
  // ============================================================================
  const { prisma } = await import('./db/client.js');

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // ============================================================================
  // 3. IMPORT MIDDLEWARE
  // ============================================================================
  const { errorHandler } = await import('./middleware/errorHandler.js');
  const { requestLogger } = await import('./middleware/requestLogger.js');
  const { tenantResolver } = await import('./middleware/tenantResolver.js');
  const { authMiddleware } = await import('./auth/middleware.js');

  console.log('📦 Middleware initialized');

  // ============================================================================
  // 4. IMPORT ROUTES
  // ============================================================================
  const { apiRouter } = await import('./api/routes.js');

  console.log('🛣️  Routes imported');

  // ============================================================================
  // 5. CREATE EXPRESS APPLICATION
  // ============================================================================
  const app = express();

  console.log('🚀 Express application created');

  // ============================================================================
  // 6. MIDDLEWARE STACK (in order)
  // ============================================================================

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Tenant resolution (multi-tenant isolation)
  app.use(tenantResolver);

  console.log('🔐 Middleware stack configured');

  // ============================================================================
  // 7. SWAGGER / OPENAPI DOCUMENTATION
  // ============================================================================

  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Serve Swagger JSON specification
  app.get('/docs/swagger.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      swaggerOptions: {
        url: '/docs/swagger.json',
      },
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Sateliteyes Guard API Documentation',
    })
  );

  console.log('📚 Swagger documentation mounted at /docs');

  // ============================================================================
  // 8. HEALTH CHECK ENDPOINT
  // ============================================================================

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      uptime: process.uptime(),
    });
  });

  console.log('❤️  Health check endpoint ready');

  // ============================================================================
  // 9. MOUNT API ROUTERS
  // ============================================================================

  // Mount main API router (includes /auth, /tenants, /cameras, /events, /health)
  app.use(`${config.apiPrefix}/${config.apiVersion}`, apiRouter);

  console.log(`✅ API routers mounted at ${config.apiPrefix}/${config.apiVersion}`);
  console.log('   - /auth (register, login)');
  console.log('   - /tenants (GET, POST, GET/:id)');
  console.log('   - /cameras (GET, POST, GET/:id, PUT, DELETE)');
  console.log('   - /events (GET, POST, GET/:id, GET/byCamera/:cameraId)');

  // ============================================================================
  // 10. GLOBAL ERROR HANDLER (MUST BE LAST)
  // ============================================================================

  app.use(errorHandler);

  console.log('🛡️  Error handler configured');

  // ============================================================================
  // 11. START SERVER
  // ============================================================================

  const PORT = config.port;

  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         🚀 SATELITEYES GUARD BACKEND - RUNNING 🚀          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📚 Documentation: http://localhost:${PORT}/docs`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log(`🔌 API: http://localhost:${PORT}${config.apiPrefix}/${config.apiVersion}`);
    console.log('');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Multi-tenant: ${config.enableMultiTenant ? 'Enabled' : 'Disabled'}`);
    console.log('');
  });
  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
})();
