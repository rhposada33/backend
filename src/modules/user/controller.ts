/**
 * User Controller
 * HTTP handlers for user authentication endpoints
 */

import { Request, Response } from 'express';
import { registerUser, loginUser, RegisterInput, LoginInput } from './service.js';

/**
 * Register endpoint
 * POST /auth/register
 * Body: { email, password, tenantId }
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, tenantId } = req.body as RegisterInput;

    // Validate required fields
    if (!email || !password || !tenantId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email, password, and tenantId are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format',
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    const result = await registerUser({ email, password, tenantId });

    res.status(201).json({
      message: 'User registered successfully',
      data: result.user,
      token: result.token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User already exists') {
      res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered',
      });
      return;
    }

    if (error instanceof Error && error.message === 'Tenant not found') {
      res.status(404).json({
        error: 'Not Found',
        message: 'Tenant not found',
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
}

/**
 * Login endpoint
 * POST /auth/login
 * Body: { email, password }
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
      return;
    }

    const result = await loginUser({ email, password });

    res.status(200).json({
      message: 'Login successful',
      data: result.user,
      token: result.token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
}
