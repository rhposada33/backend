/**
 * Authentication Routes
 * POST /auth/register - Register new user
 * POST /auth/login - Login user
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/jwt.js';

const router = Router();

interface RegisterRequest {
  email: string;
  password: string;
  tenantId: string;
  tenantName?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /auth/register
 * Register a new user
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "secure_password",
 *   "tenantId": "existing_tenant_id",
 *   "tenantName": "New Tenant Name" (optional - creates new tenant if not provided)
 * }
 */
router.post('/register', async (req: Request<{}, {}, RegisterRequest>, res: Response): Promise<void> => {
  try {
    const { email, password, tenantId, tenantName } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists',
      });
      return;
    }

    // Get or create tenant
    let tenant;
    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found',
        });
        return;
      }
    } else if (tenantName) {
      // Create new tenant if name provided
      tenant = await prisma.tenant.create({
        data: { name: tenantName },
      });
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Either tenantId or tenantName must be provided',
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        tenantId: tenant.id,
      },
      include: {
        tenant: true,
      },
    });

    // Generate JWT
    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "secure_password"
 * }
 */
router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password);

    if (!passwordValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate JWT
    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
});

export default router;
