/**
 * User Service
 * Business logic for user management and authentication
 */

import { prisma } from '../../db/client.js';
import { hashPassword, verifyPassword, signToken } from '../../auth/index.js';

export interface RegisterInput {
  email: string;
  password: string;
  tenantId?: string;
  tenantName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    tenantId: string;
    isAdmin: boolean;
  };
  token: string;
}

/**
 * Register a new user
 */
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  let tenantId = input.tenantId;

  // If tenantName is provided, create or find tenant
  if (input.tenantName && !tenantId) {
    let tenant = await prisma.tenant.findFirst({
      where: { name: input.tenantName },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: input.tenantName },
      });
    }

    tenantId = tenant.id;
  }

  // Check if tenant exists
  if (!tenantId) {
    throw new Error('Tenant ID or name is required');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Hash password
  const hashedPassword = await hashPassword(input.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      tenantId: tenantId,
    },
  });

  // Generate token
  const token = signToken({
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isAdmin: user.isAdmin,
    },
    token,
  };
}

/**
 * Login user
 */
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const passwordValid = await verifyPassword(input.password, user.password);

  if (!passwordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate token
  const token = signToken({
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isAdmin: user.isAdmin,
    },
    token,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      tenantId: true,
      isAdmin: true,
      createdAt: true,
    },
  });
}
