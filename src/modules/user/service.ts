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
  tenantName?: string;
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
  tenantId?: string;
}

async function ensureTenantExists(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }
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
export async function listUsers(tenantId?: string): Promise<UserListItem[]> {
  const users = await prisma.user.findMany({
    where: tenantId ? { tenantId } : undefined,
    include: {
      tenant: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant.name,
    createdAt: user.createdAt,
  }));
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

  await ensureTenantExists(input.tenantId);

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      tenantId: input.tenantId,
      role: input.role,
    },
    include: {
      tenant: {
        select: { name: true },
      },
    },
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant.name,
    createdAt: user.createdAt,
  };
}

/**
 * Update a user for a tenant
 */
export async function updateUserForTenant(
  userId: string,
  input: UpdateUserInput
): Promise<UserListItem> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      tenantId: true,
    },
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

  if (input.tenantId && input.tenantId !== existingUser.tenantId) {
    await ensureTenantExists(input.tenantId);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.email ? { email: input.email } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    },
    include: {
      tenant: {
        select: { name: true },
      },
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    tenantId: updatedUser.tenantId,
    tenantName: updatedUser.tenant.name,
    createdAt: updatedUser.createdAt,
  };
}

/**
 * Delete a user for a tenant
 */
export async function deleteUserForTenant(userId: string): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
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
