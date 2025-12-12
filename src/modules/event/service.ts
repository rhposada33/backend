/**
 * Event Service
 * Business logic for event management and querying
 */

import { prisma } from '../../db/client.js';

export interface EventWithCamera {
  id: string;
  tenantId: string;
  cameraId: string;
  frigateId: string;
  type: string;
  label: string | null;
  hasSnapshot: boolean;
  hasClip: boolean;
  startTime: number | null;
  endTime: number | null;
  rawPayload: any;
  createdAt: Date;
  camera: {
    id: string;
    key: string;
    label: string | null;
  };
}

export interface EventDetail extends EventWithCamera {}

export interface ListEventsResult {
  events: EventWithCamera[];
  total: number;
}

/**
 * Get all events for a tenant with pagination
 * Scoped to authenticated user's tenantId
 */
export async function getEventsByTenant(
  tenantId: string,
  skip: number,
  limit: number
): Promise<ListEventsResult> {
  // Validate pagination
  if (skip < 0 || limit < 1 || limit > 500) {
    throw new Error('Invalid pagination parameters');
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { tenantId },
      include: {
        camera: {
          select: {
            id: true,
            key: true,
            label: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.event.count({
      where: { tenantId },
    }),
  ]);

  return { events, total };
}

/**
 * Get a single event by ID
 * Validates that event belongs to user's tenant
 */
export async function getEventById(
  tenantId: string,
  eventId: string
): Promise<EventDetail | null> {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      tenantId, // Ensure tenant isolation
    },
    include: {
      camera: {
        select: {
          id: true,
          key: true,
          label: true,
        },
      },
    },
  });

  return event as EventDetail | null;
}

/**
 * Get events for a specific camera
 * Validates that camera belongs to user's tenant
 */
export async function getEventsByCamera(
  tenantId: string,
  cameraId: string,
  skip: number,
  limit: number
): Promise<ListEventsResult> {
  // Validate pagination
  if (skip < 0 || limit < 1 || limit > 500) {
    throw new Error('Invalid pagination parameters');
  }

  // Verify camera belongs to tenant
  const camera = await prisma.camera.findFirst({
    where: {
      id: cameraId,
      tenantId,
    },
  });

  if (!camera) {
    throw new Error('Camera not found or does not belong to your tenant');
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: {
        tenantId,
        cameraId,
      },
      include: {
        camera: {
          select: {
            id: true,
            key: true,
            label: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.event.count({
      where: {
        tenantId,
        cameraId,
      },
    }),
  ]);

  return { events, total };
}
