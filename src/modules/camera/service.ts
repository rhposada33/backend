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
}

export interface UpdateCameraInput {
  frigateCameraKey?: string;
  label?: string;
}

export interface CameraResponse {
  id: string;
  tenantId: string;
  frigateCameraKey: string;
  label?: string | null;
  isEnabled: boolean;
  createdAt: Date;
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
      isEnabled: true,
    },
  });

  return {
    id: camera.id,
    tenantId: camera.tenantId,
    frigateCameraKey: camera.frigateCameraKey,
    label: camera.label || undefined,
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
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      frigateCameraKey: updated.frigateCameraKey,
      label: updated.label || undefined,
      isEnabled: updated.isEnabled,
      createdAt: updated.createdAt,
    };
  }

  // Update only label and/or isEnabled
  const dataToUpdate: any = {};
  if (input.label !== undefined) {
    dataToUpdate.label = input.label.trim() || null;
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
    isEnabled: camera.isEnabled,
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

  // Transform cameras to CameraStream format with constructed URLs
  return cameras.map((camera) => buildCameraStream(camera));
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
}): CameraStream {
  // Construct livestream URL
  // Format: {FRIGATE_BASE_URL}/api/camera/{frigateCameraKey}/webrtc
  // Additional protocols available: /mjpeg, /snapshot, /clip
  const streamUrl = `${config.frigatBaseUrl}/api/camera/${encodeURIComponent(camera.frigateCameraKey)}/webrtc`;

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

