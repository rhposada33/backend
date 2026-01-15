/**
 * Configuration Module
 * Loads and validates environment variables
 */

interface Config {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  apiPrefix: string;
  apiVersion: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiry: string;
  enableMultiTenant: boolean;
  logLevel: string;
  frigatBaseUrl: string;
  frigateAuthToken?: string;
  frigateMediaPath?: string;
  frigateUsername?: string;
  frigatePassword?: string;
  // TODO: Add database configuration
  // TODO: Add additional config properties as needed
}

function getConfig(): Config {
  // Parse CORS origins - support comma-separated list or single origin
  const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080';
  
  // Frigate base URL - defaults to local Docker Frigate instance
  const frigatBaseUrl = process.env.FRIGATE_BASE_URL || 'http://frigate:5000';
  const frigateAuthToken = process.env.FRIGATE_AUTH_TOKEN;
  const frigateMediaPath = process.env.FRIGATE_MEDIA_PATH;
  const frigateUsername = process.env.FRIGATE_USERNAME;
  const frigatePassword = process.env.FRIGATE_PASSWORD;
  
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: corsOriginEnv,
    apiPrefix: process.env.API_PREFIX || '/api',
    apiVersion: process.env.API_VERSION || 'v1',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtRefreshSecret:
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    frigatBaseUrl,
    frigateAuthToken,
    frigateMediaPath,
    frigateUsername,
    frigatePassword,
    // TODO: Initialize database configuration from environment
    // TODO: Add additional configuration properties
  };
}

export const config = getConfig();
