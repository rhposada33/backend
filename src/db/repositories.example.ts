/**
 * Example Repository Pattern with Prisma
 *
 * This file demonstrates how to structure database access using Prisma
 * Copy this pattern when creating new repositories
 *
 * TODO: Create similar repositories for other models
 */

import { prisma } from './client.js';

/**
 * Example: Tenant Repository
 * Manages all tenant-related database operations
 */
export class TenantRepository {
  /**
   * Create a new tenant
   */
  async create(data: { name: string }): Promise<any> {
    return prisma.tenant.create({
      data,
    });
  }

  /**
   * Find tenant by ID
   */
  async findById(id: string): Promise<any> {
    return prisma.tenant.findUnique({
      where: { id },
      include: {
        cameras: true,
        events: true,
      },
    });
  }

  /**
   * Find all tenants
   */
  async findAll(): Promise<any[]> {
    return prisma.tenant.findMany({
      include: {
        cameras: true,
        events: true,
      },
    });
  }

  /**
   * Update tenant
   */
  async update(id: string, data: { name?: string }): Promise<any> {
    return prisma.tenant.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete tenant (cascades to cameras and events)
   */
  async delete(id: string): Promise<any> {
    return prisma.tenant.delete({
      where: { id },
    });
  }
}

/**
 * Example: Camera Repository
 */
export class CameraRepository {
  /**
   * Create a camera for a tenant
   */
  async create(tenantId: string, data: { frigateCameraKey: string; label?: string }): Promise<any> {
    return prisma.camera.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Find cameras by tenant
   */
  async findByTenantId(tenantId: string): Promise<any[]> {
    return prisma.camera.findMany({
      where: { tenantId },
      include: { events: true },
    });
  }

  /**
   * Find camera by ID
   */
  async findById(id: string): Promise<any> {
    return prisma.camera.findUnique({
      where: { id },
      include: { events: true },
    });
  }

  /**
   * Find camera by frigateCameraKey (name) and tenant
   */
  async findByKey(tenantId: string, frigateCameraKey: string): Promise<any> {
    return prisma.camera.findUnique({
      where: {
        tenantId_frigateCameraKey: {
          tenantId,
          frigateCameraKey,
        },
      },
    });
  }

  /**
   * Update camera
   */
  async update(id: string, data: { label?: string }): Promise<any> {
    return prisma.camera.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete camera
   */
  async delete(id: string): Promise<any> {
    return prisma.camera.delete({
      where: { id },
    });
  }
}

/**
 * Example: Event Repository
 */
export class EventRepository {
  /**
   * Create an event
   */
  async create(
    tenantId: string,
    cameraId: string,
    data: {
      frigateId: string;
      type: string;
      label?: string;
      hasSnapshot?: boolean;
      hasClip?: boolean;
      startTime?: number;
      endTime?: number;
      rawPayload: Record<string, any>;
    }
  ): Promise<any> {
    return prisma.event.create({
      data: {
        ...data,
        tenantId,
        cameraId,
      },
    });
  }

  /**
   * Find events by tenant
   */
  async findByTenantId(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: 'asc' | 'desc';
    }
  ): Promise<any[]> {
    return prisma.event.findMany({
      where: { tenantId },
      include: { camera: true, tenant: true },
      orderBy: { createdAt: options?.orderBy || 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Find events by camera
   */
  async findByCameraId(cameraId: string): Promise<any[]> {
    return prisma.event.findMany({
      where: { cameraId },
      include: { camera: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find event by ID
   */
  async findById(id: string): Promise<any> {
    return prisma.event.findUnique({
      where: { id },
      include: { camera: true, tenant: true },
    });
  }

  /**
   * Find event by Frigate ID (unique per tenant)
   */
  async findByFrigateId(tenantId: string, frigateId: string): Promise<any> {
    return prisma.event.findUnique({
      where: {
        tenantId_frigateId: {
          tenantId,
          frigateId,
        },
      },
    });
  }

  /**
   * Update event
   */
  async update(
    id: string,
    data: {
      label?: string;
      hasSnapshot?: boolean;
      hasClip?: boolean;
      endTime?: number;
    }
  ): Promise<any> {
    return prisma.event.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete event
   */
  async delete(id: string): Promise<any> {
    return prisma.event.delete({
      where: { id },
    });
  }

  /**
   * Count events by tenant
   */
  async countByTenantId(tenantId: string): Promise<number> {
    return prisma.event.count({
      where: { tenantId },
    });
  }

  /**
   * Get recent events (last 24 hours)
   */
  async getRecentEvents(
    tenantId: string,
    hoursBack: number = 24
  ): Promise<any[]> {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return prisma.event.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
      },
      include: { camera: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

/**
 * Export singleton instances
 */
export const tenantRepository = new TenantRepository();
export const cameraRepository = new CameraRepository();
export const eventRepository = new EventRepository();
