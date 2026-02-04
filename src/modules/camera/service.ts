/**
 * Camera Service
 * Business logic for camera management operations
 * All operations are scoped to the authenticated user's tenantId
 *
 * LIVESTREAM ARCHITECTURE:
 * ========================
 *
 * Frontend Access Pattern:
 * - Frontend NEVER accesses Frigate directly (not exposed to internet)
 * - Frontend makes all livestream requests to the Backend API
 * - Backend is responsible for generating, proxying, or forwarding livestream URLs
 *
 * Camera Key ↔ Frigate Name Mapping:
 * - The camera "frigateCameraKey" field MUST EXACTLY MATCH the Frigate camera name
 * - This is the critical bridge between the backend database and Frigate
 * - Example: If frigateCameraKey = "garage_camera", Frigate must have a camera named "garage_camera"
 *
 * Tenant Scoping:
 * - Each livestream request must be validated against the user's tenantId
 * - A user can ONLY access livestreams for cameras in their tenant
 * - The backend MUST verify: camera.tenantId === authenticatedUser.tenantId
 * - Failure to validate = Security breach (data leak across tenants)
 *
 * See CAMERA_LIVESTREAM_DESIGN.md for complete design documentation
 */

import { prisma } from '../../db/client.js';
import { CameraStream } from '../../types.js';
import { config } from '../../config/index.js';

export interface CreateCameraInput {
  frigateCameraKey: string; // Frigate camera name - must be unique per tenant and match Frigate config
  label?: string; // Human-readable display name for UI
  inputUrl?: string;
  isTestFeed?: boolean;
  inputArgs?: string;
  roles?: string;
  recordEnabled?: boolean;
  snapshotsEnabled?: boolean;
  snapshotsRetainDays?: number;
  motionEnabled?: boolean;
  detectWidth?: number;
  detectHeight?: number;
  detectFps?: number;
  zoneName?: string;
  zoneCoordinates?: string;
  zoneObjects?: string;
  reviewRequiredZones?: string;
  ip?: string;
  port?: number;
  username?: string;
  password?: string;
}

export interface UpdateCameraInput {
  frigateCameraKey?: string;
  label?: string;
  isEnabled?: boolean;
  inputUrl?: string | null;
  isTestFeed?: boolean;
  inputArgs?: string | null;
  roles?: string | null;
  recordEnabled?: boolean;
  snapshotsEnabled?: boolean;
  snapshotsRetainDays?: number | null;
  motionEnabled?: boolean;
  detectWidth?: number | null;
  detectHeight?: number | null;
  detectFps?: number | null;
  zoneName?: string | null;
  zoneCoordinates?: string | null;
  zoneObjects?: string | null;
  reviewRequiredZones?: string | null;
  ip?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
}

export interface CameraResponse {
  id: string;
  tenantId: string;
  tenantName?: string;
  frigateCameraKey: string;
  label?: string | null;
  inputUrl?: string | null;
  isTestFeed: boolean;
  inputArgs?: string | null;
  roles?: string | null;
  recordEnabled: boolean;
  snapshotsEnabled: boolean;
  snapshotsRetainDays: number;
  motionEnabled: boolean;
  detectWidth: number;
  detectHeight: number;
  detectFps: number;
  zoneName: string;
  zoneCoordinates?: string | null;
  zoneObjects?: string | null;
  reviewRequiredZones?: string | null;
  ip?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
  isEnabled: boolean;
  createdAt: Date;
}

export interface AdminCameraResponse extends CameraResponse {
  tenantName: string;
}

/**
 * Create a new camera for a tenant
 * The frigateCameraKey must be unique within the tenant
 */
export async function createCamera(
  tenantId: string,
  input: CreateCameraInput
): Promise<CameraResponse> {
  // Validate input
  if (!input.frigateCameraKey || input.frigateCameraKey.trim().length === 0) {
    throw new Error('Camera frigateCameraKey is required');
  }

  const trimmedKey = input.frigateCameraKey.trim();

  // Check if camera with this key already exists in the tenant
  const existingCamera = await prisma.camera.findUnique({
    where: {
      tenantId_frigateCameraKey: {
        tenantId,
        frigateCameraKey: trimmedKey,
      },
    },
  });

  if (existingCamera) {
    throw new Error(`Camera with frigateCameraKey "${trimmedKey}" already exists in this tenant`);
  }

  const camera = await prisma.camera.create({
    data: {
      tenantId,
      frigateCameraKey: trimmedKey,
      label: input.label?.trim() || null,
      inputUrl: input.inputUrl?.trim() || null,
      isTestFeed: input.isTestFeed ?? false,
      inputArgs: input.inputArgs?.trim() || null,
      roles: input.roles?.trim() || null,
      recordEnabled: input.recordEnabled ?? true,
      snapshotsEnabled: input.snapshotsEnabled ?? true,
      snapshotsRetainDays: input.snapshotsRetainDays ?? 10,
      motionEnabled: input.motionEnabled ?? true,
      detectWidth: input.detectWidth ?? 320,
      detectHeight: input.detectHeight ?? 180,
      detectFps: input.detectFps ?? 5,
      zoneName: input.zoneName?.trim() || 'face',
      zoneCoordinates: input.zoneCoordinates?.trim() || null,
      zoneObjects: input.zoneObjects?.trim() || 'person,car,cat,dog',
      reviewRequiredZones: input.reviewRequiredZones?.trim() || null,
      ip: input.ip?.trim() || null,
      port: input.port ?? null,
      username: input.username?.trim() || null,
      password: input.password ?? null,
      isEnabled: true,
    },
  });

  return {
    id: camera.id,
    tenantId: camera.tenantId,
    frigateCameraKey: camera.frigateCameraKey,
    label: camera.label || undefined,
    inputUrl: camera.inputUrl || undefined,
    isTestFeed: camera.isTestFeed,
    inputArgs: camera.inputArgs || undefined,
    roles: camera.roles || undefined,
    recordEnabled: camera.recordEnabled,
    snapshotsEnabled: camera.snapshotsEnabled,
    snapshotsRetainDays: camera.snapshotsRetainDays,
    motionEnabled: camera.motionEnabled,
    detectWidth: camera.detectWidth,
    detectHeight: camera.detectHeight,
    detectFps: camera.detectFps,
    zoneName: camera.zoneName,
    zoneCoordinates: camera.zoneCoordinates || undefined,
    zoneObjects: camera.zoneObjects || undefined,
    reviewRequiredZones: camera.reviewRequiredZones || undefined,
    ip: camera.ip || undefined,
    port: camera.port ?? undefined,
    username: camera.username || undefined,
    password: camera.password || undefined,
    isEnabled: camera.isEnabled,
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
    frigateCameraKey: camera.frigateCameraKey,
    label: camera.label || undefined,
    inputUrl: camera.inputUrl || undefined,
    isTestFeed: camera.isTestFeed,
    inputArgs: camera.inputArgs || undefined,
    roles: camera.roles || undefined,
    recordEnabled: camera.recordEnabled,
    snapshotsEnabled: camera.snapshotsEnabled,
    snapshotsRetainDays: camera.snapshotsRetainDays,
    motionEnabled: camera.motionEnabled,
    detectWidth: camera.detectWidth,
    detectHeight: camera.detectHeight,
    detectFps: camera.detectFps,
    zoneName: camera.zoneName,
    zoneCoordinates: camera.zoneCoordinates || undefined,
    zoneObjects: camera.zoneObjects || undefined,
    reviewRequiredZones: camera.reviewRequiredZones || undefined,
    ip: camera.ip || undefined,
    port: camera.port ?? undefined,
    username: camera.username || undefined,
    password: camera.password || undefined,
    isEnabled: camera.isEnabled,
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
      frigateCameraKey: camera.frigateCameraKey,
      label: camera.label || undefined,
      inputUrl: camera.inputUrl || undefined,
      isTestFeed: camera.isTestFeed,
      inputArgs: camera.inputArgs || undefined,
      roles: camera.roles || undefined,
      recordEnabled: camera.recordEnabled,
      snapshotsEnabled: camera.snapshotsEnabled,
      snapshotsRetainDays: camera.snapshotsRetainDays,
      motionEnabled: camera.motionEnabled,
      detectWidth: camera.detectWidth,
      detectHeight: camera.detectHeight,
      detectFps: camera.detectFps,
      zoneName: camera.zoneName,
      zoneCoordinates: camera.zoneCoordinates || undefined,
      zoneObjects: camera.zoneObjects || undefined,
      reviewRequiredZones: camera.reviewRequiredZones || undefined,
      ip: camera.ip || undefined,
      port: camera.port ?? undefined,
      username: camera.username || undefined,
      password: camera.password || undefined,
      isEnabled: camera.isEnabled,
      createdAt: camera.createdAt,
    });
  }

  return {
    cameras: cameraResponses,
    total,
  };
}

/**
 * Get all cameras across tenants (admin use)
 */
export async function getAllCameras(
  skip: number = 0,
  take: number = 100
): Promise<{ cameras: AdminCameraResponse[]; total: number }> {
  const [cameras, total] = await Promise.all([
    prisma.camera.findMany({
      skip,
      take,
      include: {
        tenant: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.camera.count(),
  ]);

  return {
    cameras: cameras.map((camera) => ({
      id: camera.id,
      tenantId: camera.tenantId,
      tenantName: camera.tenant.name,
      frigateCameraKey: camera.frigateCameraKey,
      label: camera.label || undefined,
      inputUrl: camera.inputUrl || undefined,
      isTestFeed: camera.isTestFeed,
      inputArgs: camera.inputArgs || undefined,
      roles: camera.roles || undefined,
      recordEnabled: camera.recordEnabled,
      snapshotsEnabled: camera.snapshotsEnabled,
      snapshotsRetainDays: camera.snapshotsRetainDays,
      motionEnabled: camera.motionEnabled,
      detectWidth: camera.detectWidth,
      detectHeight: camera.detectHeight,
      detectFps: camera.detectFps,
      zoneName: camera.zoneName,
      zoneCoordinates: camera.zoneCoordinates || undefined,
      zoneObjects: camera.zoneObjects || undefined,
      reviewRequiredZones: camera.reviewRequiredZones || undefined,
      ip: camera.ip || undefined,
      port: camera.port ?? undefined,
      username: camera.username || undefined,
      password: camera.password || undefined,
      isEnabled: camera.isEnabled,
      createdAt: camera.createdAt,
    })),
    total,
  };
}

/**
 * Update a camera by ID (admin use)
 */
export async function updateCameraById(
  cameraId: string,
  input: UpdateCameraInput
): Promise<AdminCameraResponse> {
  const camera = await prisma.camera.findUnique({
    where: { id: cameraId },
    include: {
      tenant: { select: { name: true } },
    },
  });

  if (!camera) {
    throw new Error('Camera not found');
  }

  const dataToUpdate: any = {};
  if (input.frigateCameraKey !== undefined) {
    dataToUpdate.frigateCameraKey = input.frigateCameraKey.trim();
  }
  if (input.label !== undefined) {
    dataToUpdate.label = input.label ? input.label.trim() : null;
  }
  if (input.inputUrl !== undefined) {
    dataToUpdate.inputUrl = input.inputUrl ? input.inputUrl.trim() : null;
  }
  if (input.isTestFeed !== undefined) {
    dataToUpdate.isTestFeed = input.isTestFeed;
  }
  if (input.inputArgs !== undefined) {
    dataToUpdate.inputArgs = input.inputArgs ? input.inputArgs.trim() : null;
  }
  if (input.roles !== undefined) {
    dataToUpdate.roles = input.roles ? input.roles.trim() : null;
  }
  if (input.recordEnabled !== undefined) {
    dataToUpdate.recordEnabled = input.recordEnabled;
  }
  if (input.snapshotsEnabled !== undefined) {
    dataToUpdate.snapshotsEnabled = input.snapshotsEnabled;
  }
  if (input.snapshotsRetainDays !== undefined) {
    dataToUpdate.snapshotsRetainDays = input.snapshotsRetainDays;
  }
  if (input.motionEnabled !== undefined) {
    dataToUpdate.motionEnabled = input.motionEnabled;
  }
  if (input.detectWidth !== undefined) {
    dataToUpdate.detectWidth = input.detectWidth;
  }
  if (input.detectHeight !== undefined) {
    dataToUpdate.detectHeight = input.detectHeight;
  }
  if (input.detectFps !== undefined) {
    dataToUpdate.detectFps = input.detectFps;
  }
  if (input.zoneName !== undefined) {
    dataToUpdate.zoneName = input.zoneName ? input.zoneName.trim() : null;
  }
  if (input.zoneCoordinates !== undefined) {
    dataToUpdate.zoneCoordinates = input.zoneCoordinates ? input.zoneCoordinates.trim() : null;
  }
  if (input.zoneObjects !== undefined) {
    dataToUpdate.zoneObjects = input.zoneObjects ? input.zoneObjects.trim() : null;
  }
  if (input.reviewRequiredZones !== undefined) {
    dataToUpdate.reviewRequiredZones = input.reviewRequiredZones ? input.reviewRequiredZones.trim() : null;
  }
  if (input.ip !== undefined) {
    dataToUpdate.ip = input.ip ? input.ip.trim() : null;
  }
  if (input.port !== undefined) {
    dataToUpdate.port = input.port;
  }
  if (input.username !== undefined) {
    dataToUpdate.username = input.username ? input.username.trim() : null;
  }
  if (input.password !== undefined) {
    dataToUpdate.password = input.password;
  }
  if (input.isEnabled !== undefined) {
    dataToUpdate.isEnabled = input.isEnabled;
  }

  const updated = await prisma.camera.update({
    where: { id: cameraId },
    data: dataToUpdate,
    include: {
      tenant: { select: { name: true } },
    },
  });

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    tenantName: updated.tenant.name,
    frigateCameraKey: updated.frigateCameraKey,
    label: updated.label || undefined,
    inputUrl: updated.inputUrl || undefined,
    isTestFeed: updated.isTestFeed,
    inputArgs: updated.inputArgs || undefined,
    roles: updated.roles || undefined,
    recordEnabled: updated.recordEnabled,
    snapshotsEnabled: updated.snapshotsEnabled,
    snapshotsRetainDays: updated.snapshotsRetainDays,
    motionEnabled: updated.motionEnabled,
    detectWidth: updated.detectWidth,
    detectHeight: updated.detectHeight,
    detectFps: updated.detectFps,
    zoneName: updated.zoneName,
    zoneCoordinates: updated.zoneCoordinates || undefined,
    zoneObjects: updated.zoneObjects || undefined,
    reviewRequiredZones: updated.reviewRequiredZones || undefined,
    ip: updated.ip || undefined,
    port: updated.port ?? undefined,
    username: updated.username || undefined,
    password: updated.password || undefined,
    isEnabled: updated.isEnabled,
    createdAt: updated.createdAt,
  };
}

/**
 * Get a camera by ID with tenant (admin use)
 */
export async function getCameraByIdAdmin(cameraId: string): Promise<AdminCameraResponse> {
  const camera = await prisma.camera.findUnique({
    where: { id: cameraId },
    include: {
      tenant: { select: { name: true } },
    },
  });

  if (!camera) {
    throw new Error('Camera not found');
  }

  return {
    id: camera.id,
    tenantId: camera.tenantId,
    tenantName: camera.tenant.name,
    frigateCameraKey: camera.frigateCameraKey,
    label: camera.label || undefined,
    inputUrl: camera.inputUrl || undefined,
    isTestFeed: camera.isTestFeed,
    inputArgs: camera.inputArgs || undefined,
    roles: camera.roles || undefined,
    recordEnabled: camera.recordEnabled,
    snapshotsEnabled: camera.snapshotsEnabled,
    snapshotsRetainDays: camera.snapshotsRetainDays,
    motionEnabled: camera.motionEnabled,
    detectWidth: camera.detectWidth,
    detectHeight: camera.detectHeight,
    detectFps: camera.detectFps,
    zoneName: camera.zoneName,
    zoneCoordinates: camera.zoneCoordinates || undefined,
    zoneObjects: camera.zoneObjects || undefined,
    reviewRequiredZones: camera.reviewRequiredZones || undefined,
    ip: camera.ip || undefined,
    port: camera.port ?? undefined,
    username: camera.username || undefined,
    password: camera.password || undefined,
    isEnabled: camera.isEnabled,
    createdAt: camera.createdAt,
  };
}

/**
 * Delete a camera by ID (admin use)
 */
export async function deleteCameraById(cameraId: string): Promise<void> {
  const camera = await prisma.camera.findUnique({
    where: { id: cameraId },
  });

  if (!camera) {
    throw new Error('Camera not found');
  }

  await deleteCameraRecords(cameraId);
}

/**
 * Update a camera (must belong to tenant)
 * Only frigateCameraKey, label, and isEnabled can be updated
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

  // If updating frigateCameraKey, check uniqueness within tenant
  if (input.frigateCameraKey && input.frigateCameraKey !== camera.frigateCameraKey) {
    const trimmedKey = input.frigateCameraKey.trim();

    const existingCamera = await prisma.camera.findUnique({
      where: {
        tenantId_frigateCameraKey: {
          tenantId,
          frigateCameraKey: trimmedKey,
        },
      },
    });

    if (existingCamera) {
      throw new Error(`Camera with frigateCameraKey "${trimmedKey}" already exists in this tenant`);
    }

    // Update with new key
    const updated = await prisma.camera.update({
      where: { id: cameraId },
      data: {
        frigateCameraKey: trimmedKey,
        label: input.label !== undefined ? input.label?.trim() || null : camera.label,
        isEnabled: input.isEnabled !== undefined ? input.isEnabled : camera.isEnabled,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      frigateCameraKey: updated.frigateCameraKey,
      label: updated.label || undefined,
      inputUrl: updated.inputUrl || undefined,
      isTestFeed: updated.isTestFeed,
      inputArgs: updated.inputArgs || undefined,
      roles: updated.roles || undefined,
      recordEnabled: updated.recordEnabled,
      snapshotsEnabled: updated.snapshotsEnabled,
      snapshotsRetainDays: updated.snapshotsRetainDays,
      motionEnabled: updated.motionEnabled,
      detectWidth: updated.detectWidth,
      detectHeight: updated.detectHeight,
      detectFps: updated.detectFps,
      zoneName: updated.zoneName,
      zoneCoordinates: updated.zoneCoordinates || undefined,
      zoneObjects: updated.zoneObjects || undefined,
      reviewRequiredZones: updated.reviewRequiredZones || undefined,
      ip: updated.ip || undefined,
      port: updated.port ?? undefined,
      username: updated.username || undefined,
      password: updated.password || undefined,
      isEnabled: updated.isEnabled,
      createdAt: updated.createdAt,
    };
  }

  // Update only label and/or isEnabled
  const dataToUpdate: any = {};
  if (input.label !== undefined) {
    dataToUpdate.label = input.label.trim() || null;
  }

  if (input.inputUrl !== undefined) {
    dataToUpdate.inputUrl = input.inputUrl ? input.inputUrl.trim() : null;
  }

  if (input.isTestFeed !== undefined) {
    dataToUpdate.isTestFeed = input.isTestFeed;
  }

  if (input.inputArgs !== undefined) {
    dataToUpdate.inputArgs = input.inputArgs ? input.inputArgs.trim() : null;
  }

  if (input.roles !== undefined) {
    dataToUpdate.roles = input.roles ? input.roles.trim() : null;
  }

  if (input.recordEnabled !== undefined) {
    dataToUpdate.recordEnabled = input.recordEnabled;
  }

  if (input.snapshotsEnabled !== undefined) {
    dataToUpdate.snapshotsEnabled = input.snapshotsEnabled;
  }

  if (input.snapshotsRetainDays !== undefined) {
    dataToUpdate.snapshotsRetainDays = input.snapshotsRetainDays;
  }

  if (input.motionEnabled !== undefined) {
    dataToUpdate.motionEnabled = input.motionEnabled;
  }

  if (input.detectWidth !== undefined) {
    dataToUpdate.detectWidth = input.detectWidth;
  }

  if (input.detectHeight !== undefined) {
    dataToUpdate.detectHeight = input.detectHeight;
  }

  if (input.detectFps !== undefined) {
    dataToUpdate.detectFps = input.detectFps;
  }

  if (input.zoneName !== undefined) {
    dataToUpdate.zoneName = input.zoneName ? input.zoneName.trim() : null;
  }

  if (input.zoneCoordinates !== undefined) {
    dataToUpdate.zoneCoordinates = input.zoneCoordinates ? input.zoneCoordinates.trim() : null;
  }

  if (input.zoneObjects !== undefined) {
    dataToUpdate.zoneObjects = input.zoneObjects ? input.zoneObjects.trim() : null;
  }

  if (input.reviewRequiredZones !== undefined) {
    dataToUpdate.reviewRequiredZones = input.reviewRequiredZones ? input.reviewRequiredZones.trim() : null;
  }

  if (input.ip !== undefined) {
    dataToUpdate.ip = input.ip ? input.ip.trim() : null;
  }

  if (input.port !== undefined) {
    dataToUpdate.port = input.port;
  }

  if (input.username !== undefined) {
    dataToUpdate.username = input.username ? input.username.trim() : null;
  }

  if (input.password !== undefined) {
    dataToUpdate.password = input.password;
  }

  if (input.isEnabled !== undefined) {
    dataToUpdate.isEnabled = input.isEnabled;
  }

  if (Object.keys(dataToUpdate).length > 0) {
    const updated = await prisma.camera.update({
      where: { id: cameraId },
      data: dataToUpdate,
    });

    return {
      id: updated.id,
    tenantId: updated.tenantId,
    frigateCameraKey: updated.frigateCameraKey,
    label: updated.label || undefined,
    inputUrl: updated.inputUrl || undefined,
    isTestFeed: updated.isTestFeed,
    ip: updated.ip || undefined,
    port: updated.port ?? undefined,
      username: updated.username || undefined,
      password: updated.password || undefined,
      isEnabled: updated.isEnabled,
      createdAt: updated.createdAt,
    };
  }

  // No changes
  return {
    id: camera.id,
    tenantId: camera.tenantId,
    frigateCameraKey: camera.frigateCameraKey,
    label: camera.label || undefined,
    inputUrl: camera.inputUrl || undefined,
    isTestFeed: camera.isTestFeed,
    ip: camera.ip || undefined,
    port: camera.port ?? undefined,
    username: camera.username || undefined,
    password: camera.password || undefined,
    isEnabled: camera.isEnabled,
    createdAt: camera.createdAt,
  };
}

/**
 * Delete a camera (must belong to tenant)
 * Related events/reviews are deleted explicitly to avoid FK issues in older schemas.
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

  await deleteCameraRecords(cameraId);
}

async function deleteCameraRecords(cameraId: string): Promise<void> {
  await prisma.$transaction([
    prisma.event.deleteMany({ where: { cameraId } }),
    prisma.review.deleteMany({ where: { cameraId } }),
    prisma.camera.delete({ where: { id: cameraId } }),
  ]);
}

/**
 * Get camera by frigateCameraKey (Frigate camera name) for a tenant
 * Useful for matching incoming Frigate events
 */
export async function getCameraByKey(
  tenantId: string,
  frigateCameraKey: string
): Promise<CameraResponse | null> {
  const camera = await prisma.camera.findUnique({
    where: {
      tenantId_frigateCameraKey: {
        tenantId,
        frigateCameraKey: frigateCameraKey.trim(),
      },
    },
  });
  if (!camera) {
    return null;
  }

  return {
    id: camera.id,
    tenantId: camera.tenantId,
    frigateCameraKey: camera.frigateCameraKey,
    label: camera.label || undefined,
    inputUrl: camera.inputUrl || undefined,
    isTestFeed: camera.isTestFeed,
    ip: camera.ip || undefined,
    port: camera.port ?? undefined,
    username: camera.username || undefined,
    password: camera.password || undefined,
    isEnabled: camera.isEnabled,
    createdAt: camera.createdAt,
  };
}

/**
 * Get all cameras with livestream information for a tenant
 * Constructs stream URLs using Frigate base URL
 * Does NOT expose raw Frigate credentials
 *
 * SECURITY NOTE: Tenant scoping is enforced at database query level
 */
export async function getCameraStreams(tenantId: string): Promise<CameraStream[]> {
  const cameras = await prisma.camera.findMany({
    where: {
      tenantId, // Enforce tenant scoping
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const { getTenantFrigateClient } = await import('../frigateServer/service.js');
  const client = await getTenantFrigateClient(tenantId);

  // Transform cameras to CameraStream format with constructed URLs
  return cameras.map((camera) => buildCameraStream(camera, client.baseUrl));
}

/**
 * Build a CameraStream object for a given camera
 * Constructs the livestream URL using Frigate base URL and frigateCameraKey
 * The frigateCameraKey must match the Frigate camera name
 */
function buildCameraStream(camera: {
  id: string;
  frigateCameraKey: string;
  label: string | null;
}, baseUrl: string): CameraStream {
  // Construct livestream URL
  // Format: {FRIGATE_BASE_URL}/api/camera/{frigateCameraKey}/webrtc
  // Additional protocols available: /mjpeg, /snapshot, /clip
  const streamUrl = `${baseUrl}/api/camera/${encodeURIComponent(camera.frigateCameraKey)}/webrtc`;

  return {
    cameraId: camera.id,
    cameraName: camera.label || camera.frigateCameraKey,
    streamUrl,
    // TODO: Implement actual status checking by querying Frigate
    // For now, hardcoding to 'live' - will be replaced with real status
    status: 'live',
  };
}

/**
 * ============================================================================
 * LIVESTREAM FUNCTIONS - TODO: Implement before enabling livestream endpoints
 * ============================================================================
 *
 * These functions will handle camera livestream access and proxying.
 * Key Requirements:
 * 1. Always validate tenant scope (tenantId must match)
 * 2. Verify camera key matches Frigate camera name
 * 3. Frontend never accesses Frigate directly
 * 4. Backend generates/proxies all livestream URLs
 * 5. Implement tenant-scoped and camera-scoped access control
 *
 * See CAMERA_LIVESTREAM_DESIGN.md for full architecture documentation
 */

// TODO: getCameraStreamUrl(tenantId: string, cameraId: string, protocol?: 'webrtc' | 'mjpeg' | 'hls'): Promise<CameraStream>
// TODO: getCameraStreamStatus(tenantId: string, cameraId: string): Promise<'live' | 'offline' | 'recording'>
// TODO: validateCameraKeyWithFrigate(key: string): Promise<boolean>
// TODO: proxyCameraStream(tenantId: string, cameraId: string, response: Response): Promise<void>
