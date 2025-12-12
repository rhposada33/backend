/**
 * Tenant Service
 * Business logic for tenant management operations
 */

import { prisma } from '../../db/client.js';

export interface CreateTenantInput {
  name: string;
  description?: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  userCount?: number;
}

/**
 * Get a single tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<TenantResponse | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        select: { id: true },
      },
    },
  });

  if (!tenant) {
    return null;
  }

  return {
    id: tenant.id,
    name: tenant.name,
    description: tenant.description || undefined,
    createdAt: tenant.createdAt,
    userCount: tenant.users.length,
  };
}

/**
 * Get all tenants (with pagination and filtering)
 */
export async function getAllTenants(
  skip: number = 0,
  take: number = 10
): Promise<{ tenants: TenantResponse[]; total: number }> {
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      skip,
      take,
      include: {
        users: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.count(),
  ]);

  return {
    tenants: tenants.map((tenant) => {
      return {
        id: tenant.id,
        name: tenant.name,
        description: tenant.description || undefined,
        createdAt: tenant.createdAt,
        userCount: tenant.users.length,
      };
    }),
    total,
  };
}

/**
 * Create a new tenant
 */
export async function createTenant(input: CreateTenantInput): Promise<TenantResponse> {
  const tenant = await prisma.tenant.create({
    data: {
      name: input.name,
      description: input.description || null,
    },
    include: {
      users: {
        select: { id: true },
      },
    },
  });

  return {
    id: tenant.id,
    name: tenant.name,
    description: tenant.description || undefined,
    createdAt: tenant.createdAt,
    userCount: tenant.users.length,
  };
}

/**
 * Update a tenant
 */
export async function updateTenant(
  tenantId: string,
  input: Partial<CreateTenantInput>
): Promise<TenantResponse> {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description || null }),
    },
    include: {
      users: {
        select: { id: true },
      },
    },
  });

  return {
    id: tenant.id,
    name: tenant.name,
    description: tenant.description || undefined,
    createdAt: tenant.createdAt,
    userCount: tenant.users.length,
  };
}

/**
 * Delete a tenant (cascade deletes users and related data)
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  await prisma.tenant.delete({
    where: { id: tenantId },
  });
}

/**
 * Get tenant users
 */
export async function getTenantUsers(tenantId: string) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      email: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return users;
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  return user?.isAdmin ?? false;
}
