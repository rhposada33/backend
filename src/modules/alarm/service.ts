/**
 * Alarm Service
 * Treats events as alarms for query and filtering
 */

import { prisma } from '../../db/client.js';

export interface AlarmFilters {
  cameraId?: string;
  label?: string;
  type?: string;
  from?: Date;
  to?: Date;
}

export interface AlarmItem {
  id: string;
  frigateId: string;
  type: string;
  label: string | null;
  hasSnapshot: boolean;
  hasClip: boolean;
  startTime: number | null;
  endTime: number | null;
  createdAt: Date;
  status: 'unresolved';
  severity: 'detection';
  camera: {
    id: string;
    frigateCameraKey: string;
    label: string | null;
  };
}

export interface ListAlarmsResult {
  alarms: AlarmItem[];
  total: number;
}

export async function getAlarmsByTenant(
  tenantId: string,
  filters: AlarmFilters,
  skip: number,
  limit: number
): Promise<ListAlarmsResult> {
  const where: Record<string, unknown> = { tenantId };

  if (filters.cameraId) {
    where.cameraId = filters.cameraId;
  }
  if (filters.label) {
    where.label = filters.label;
  }
  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      (where.createdAt as Record<string, Date>).gte = filters.from;
    }
    if (filters.to) {
      (where.createdAt as Record<string, Date>).lte = filters.to;
    }
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        camera: {
          select: {
            id: true,
            frigateCameraKey: true,
            label: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  const alarms = events.map((event) => ({
    id: event.id,
    frigateId: event.frigateId,
    type: event.type,
    label: event.label,
    hasSnapshot: event.hasSnapshot,
    hasClip: event.hasClip,
    startTime: event.startTime ?? null,
    endTime: event.endTime ?? null,
    createdAt: event.createdAt,
    status: 'unresolved' as const,
    severity: 'detection' as const,
    camera: event.camera,
  }));

  return { alarms, total };
}
