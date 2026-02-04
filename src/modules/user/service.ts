/**
 * User Service
 * Business logic for user management and authentication
 */

import { prisma } from '../../db/client.js';
import { hashPassword, verifyPassword, signToken } from '../../auth/index.js';

export type UserTheme = 'DARK' | 'LIGHT';

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
    role: 'ADMIN' | 'CLIENT';
    theme: UserTheme;
  };
  token: string;
}

export interface UserListItem {
  id: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  tenantId: string;
  createdAt: Date;
}

export interface UserPreferences {
  theme: UserTheme;
}

export interface CreateUserInput {
  email: string;
  password: string;
  tenantId: string;
  role: 'ADMIN' | 'CLIENT';
}

export interface UpdateUserInput {
  email?: string;
  role?: 'ADMIN' | 'CLIENT';
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

  const existingUsers = await prisma.user.count({
    where: { tenantId: tenantId },
  });

  const assignedRole: 'ADMIN' | 'CLIENT' = existingUsers === 0 ? 'ADMIN' : 'CLIENT';

  // Hash password
  const hashedPassword = await hashPassword(input.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      tenantId: tenantId,
      role: assignedRole,
    },
  });

  // Generate token
  const token = signToken({
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      theme: user.theme,
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
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      theme: user.theme,
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
      role: true,
      createdAt: true,
    },
  });
}

/**
 * List users for a tenant
 */
export async function listUsers(tenantId: string): Promise<UserListItem[]> {
  return prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      email: true,
      role: true,
      tenantId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create a user for a tenant
 */
export async function createUserForTenant(input: CreateUserInput): Promise<UserListItem> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      tenantId: input.tenantId,
      role: input.role,
    },
    select: {
      id: true,
      email: true,
      role: true,
      tenantId: true,
      createdAt: true,
    },
  });
}

/**
 * Update a user for a tenant
 */
export async function updateUserForTenant(
  userId: string,
  tenantId: string,
  input: UpdateUserInput
): Promise<UserListItem> {
  const existingUser = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  if (input.email && input.email !== existingUser.email) {
    const emailOwner = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (emailOwner) {
      throw new Error('User already exists');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.email ? { email: input.email } : {}),
      ...(input.role ? { role: input.role } : {}),
    },
    select: {
      id: true,
      email: true,
      role: true,
      tenantId: true,
      createdAt: true,
    },
  });
}

/**
 * Delete a user for a tenant
 */
export async function deleteUserForTenant(userId: string, tenantId: string): Promise<void> {
  const existingUser = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  await prisma.user.delete({
    where: { id: userId },
  });
}

/**
 * Get UI preferences for the authenticated user
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { theme: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    theme: user.theme,
  };
}

/**
 * Update UI theme preference for the authenticated user
 */
export async function updateUserTheme(userId: string, theme: UserTheme): Promise<UserPreferences> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { theme },
    select: { theme: true },
  });

  return {
    theme: user.theme,
  };
}
