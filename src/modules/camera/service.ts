/**
 * Camera Service
 * Business logic for camera management operations
 * All operations are scoped to the authenticated user's tenantId
 */

import { prisma } from '../../db/client.js';

export interface CreateCameraInput {
  key: string; // Frigate camera name - must be unique per tenant
  label?: string;
}

export interface UpdateCameraInput {
  key?: string;
  label?: string;
}

export interface CameraResponse {
  id: string;
  tenantId: string;
  key: string;
  label?: string | null;
  createdAt: Date;
}

/**
 * Create a new camera for a tenant
 * The key must be unique within the tenant
 */
export async function createCamera(
  tenantId: string,
  input: CreateCameraInput
): Promise<CameraResponse> {
  // Validate input
  if (!input.key || input.key.trim().length === 0) {
    throw new Error('Camera key is required');
  }

  const trimmedKey = input.key.trim();

  // Check if camera with this key already exists in the tenant
  const existingCamera = await prisma.camera.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key: trimmedKey,
      },
    },
  });

  if (existingCamera) {
    throw new Error(`Camera with key "${trimmedKey}" already exists in this tenant`);
  }

  const camera = await prisma.camera.create({
    data: {
      tenantId,
      key: trimmedKey,
      label: input.label?.trim() || null,
    },
  });

  return {
    id: camera.id,
    tenantId: camera.tenantId,
    key: camera.key,
    label: camera.label || undefined,
    createdAt: camera.createdAt,
  };
}

/**
 * Get a single camera by ID (must belong to tenant)
 */
export async function getCameraById(
  tenantId: string,
  cameraId: string
): Promise<CameraResponse | null> {
  const camera = await prisma.camera.findFirst({
    where: {
      id: cameraId,
      tenantId, // Ensure it belongs to the user's tenant
    },
  });

  if (!camera) {
    return null;
  }

  return {
    id: camera.id,
    tenantId: camera.tenantId,
    key: camera.key,
    label: camera.label || undefined,
    createdAt: camera.createdAt,
  };
}

/**
 * Get all cameras for a tenant with pagination
 */
export async function getCamerasByTenant(
  tenantId: string,
  skip: number = 0,
  take: number = 50
): Promise<{ cameras: CameraResponse[]; total: number }> {
  const [cameras, total] = await Promise.all([
    prisma.camera.findMany({
      where: { tenantId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.camera.count({
      where: { tenantId },
    }),
  ]);

  const cameraResponses: CameraResponse[] = [];
  for (const camera of cameras) {
    cameraResponses.push({
      id: camera.id,
      tenantId: camera.tenantId,
      key: camera.key,
      label: camera.label || undefined,
      createdAt: camera.createdAt,
    });
  }

  return {
    cameras: cameraResponses,
    total,
  };
}

/**
 * Update a camera (must belong to tenant)
 * Only key and label can be updated
 */
export async function updateCamera(
  tenantId: string,
  cameraId: string,
  input: UpdateCameraInput
): Promise<CameraResponse> {
  // Verify camera belongs to tenant
  const camera = await prisma.camera.findFirst({
    where: {
      id: cameraId,
      tenantId,
    },
  });

  if (!camera) {
    throw new Error('Camera not found');
  }

  // If updating key, check uniqueness within tenant
  if (input.key && input.key !== camera.key) {
    const trimmedKey = input.key.trim();

    const existingCamera = await prisma.camera.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: trimmedKey,
        },
      },
    });

    if (existingCamera) {
      throw new Error(`Camera with key "${trimmedKey}" already exists in this tenant`);
    }

    // Update with new key
    const updated = await prisma.camera.update({
      where: { id: cameraId },
      data: {
        key: trimmedKey,
        label: input.label !== undefined ? input.label?.trim() || null : camera.label,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      key: updated.key,
      label: updated.label || undefined,
      createdAt: updated.createdAt,
    };
  }

  // Update only label
  if (input.label !== undefined) {
    const updated = await prisma.camera.update({
      where: { id: cameraId },
      data: {
        label: input.label.trim() || null,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      key: updated.key,
      label: updated.label || undefined,
      createdAt: updated.createdAt,
    };
  }

  // No changes
  return {
    id: camera.id,
    tenantId: camera.tenantId,
    key: camera.key,
    label: camera.label || undefined,
    createdAt: camera.createdAt,
  };
}

/**
 * Delete a camera (must belong to tenant)
 * Related events are cascade deleted via Prisma
 */
export async function deleteCamera(
  tenantId: string,
  cameraId: string
): Promise<void> {
  // Verify camera belongs to tenant before deleting
  const camera = await prisma.camera.findFirst({
    where: {
      id: cameraId,
      tenantId,
    },
  });

  if (!camera) {
    throw new Error('Camera not found');
  }

  await prisma.camera.delete({
    where: { id: cameraId },
  });
}

/**
 * Get camera by key (Frigate camera name) for a tenant
 * Useful for matching incoming Frigate events
 */
export async function getCameraByKey(
  tenantId: string,
  key: string
): Promise<CameraResponse | null> {
  const camera = await prisma.camera.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key: key.trim(),
      },
    },
  });

  if (!camera) {
    return null;
  }

  return {
    id: camera.id,
    tenantId: camera.tenantId,
    key: camera.key,
    label: camera.label || undefined,
    createdAt: camera.createdAt,
  };
}
