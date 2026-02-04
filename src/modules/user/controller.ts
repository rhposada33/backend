/**
 * User Controller
 * HTTP handlers for user authentication endpoints
 */

import { Request, Response } from 'express';
import { registerUser, loginUser, listUsers, createUserForTenant, updateUserForTenant, deleteUserForTenant, getUserPreferences, updateUserTheme, LoginInput, UserTheme } from './service.js';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import * as tenantService from '../tenant/service.js';

/**
 * Register endpoint
 * POST /auth/register
 * Body: { email, password, tenantId OR tenantName }
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, tenantId, tenantName } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
      return;
    }

    if (!tenantId && !tenantName) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Either tenantId or tenantName must be provided',
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

    const result = await registerUser({ 
      email, 
      password, 
      tenantId: tenantId || undefined,
      tenantName: tenantName || undefined
    });

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_VALUES = new Set(['ADMIN', 'CLIENT']);
const THEME_VALUES = new Set<UserTheme>(['DARK', 'LIGHT']);

interface ThemeUpdateRequest {
  theme?: string;
}

/**
 * GET /users/me/preferences
 * Get preferences for the authenticated user
 */
export async function getMyPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const preferences = await getUserPreferences(req.user.userId);

    res.status(200).json({
      data: preferences,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    console.error('Get preferences error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user preferences',
    });
  }
}

/**
 * PATCH /users/me/preferences/theme
 * Update theme preference for the authenticated user
 */
export async function updateMyTheme(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { theme } = req.body as ThemeUpdateRequest;
    if (!theme || !THEME_VALUES.has(theme as UserTheme)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Theme must be DARK or LIGHT',
      });
      return;
    }

    const preferences = await updateUserTheme(req.user.userId, theme as UserTheme);

    res.status(200).json({
      message: 'Theme updated successfully',
      data: preferences,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    console.error('Update theme error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user theme',
    });
  }
}

/**
 * GET /users
 * List users for the authenticated tenant (admin only)
 */
export async function listTenantUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const isAdmin = await tenantService.isUserAdmin(req.user.userId);
    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can list users',
      });
      return;
    }

    const users = await listUsers(req.user.tenantId);
    res.status(200).json({
      data: users,
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list users',
    });
  }
}

interface CreateUserRequest {
  email: string;
  password: string;
  role?: 'ADMIN' | 'CLIENT';
}

/**
 * POST /users
 * Create a new user for the authenticated tenant (admin only)
 */
export async function createTenantUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const isAdmin = await tenantService.isUserAdmin(req.user.userId);
    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can create users',
      });
      return;
    }

    const { email, password, role } = req.body as CreateUserRequest;

    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    const normalizedRole = role ?? 'CLIENT';
    if (!ROLE_VALUES.has(normalizedRole)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Role must be ADMIN or CLIENT',
      });
      return;
    }

    const user = await createUserForTenant({
      email,
      password,
      tenantId: req.user.tenantId,
      role: normalizedRole,
    });

    res.status(201).json({
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User already exists') {
      res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered',
      });
      return;
    }

    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user',
    });
  }
}

interface UpdateUserRequest {
  email?: string;
  role?: 'ADMIN' | 'CLIENT';
}

/**
 * PATCH /users/:id
 * Update a user for the authenticated tenant (admin only)
 */
export async function updateTenantUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const isAdmin = await tenantService.isUserAdmin(req.user.userId);
    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can update users',
      });
      return;
    }

    const { id } = req.params;
    const { email, role } = req.body as UpdateUserRequest;

    if (email && !EMAIL_REGEX.test(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format',
      });
      return;
    }

    if (role && !ROLE_VALUES.has(role)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Role must be ADMIN or CLIENT',
      });
      return;
    }

    const updatedUser = await updateUserForTenant(id, req.user.tenantId, {
      email,
      role,
    });

    res.status(200).json({
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    if (error instanceof Error && error.message === 'User already exists') {
      res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered',
      });
      return;
    }

    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user',
    });
  }
}

/**
 * DELETE /users/:id
 * Delete a user for the authenticated tenant (admin only)
 */
export async function deleteTenantUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const isAdmin = await tenantService.isUserAdmin(req.user.userId);
    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can delete users',
      });
      return;
    }

    const { id } = req.params;
    if (id === req.user.userId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'You cannot delete your own user',
      });
      return;
    }

    await deleteUserForTenant(id, req.user.tenantId);

    res.status(200).json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user',
    });
  }
}
