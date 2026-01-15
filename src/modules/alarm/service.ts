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
  status: 'unresolved' | 'acknowledged' | 'resolved';
  severity: 'detection';
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
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

export interface AlarmMediaInfo {
  frigateId: string;
  hasSnapshot: boolean;
  hasClip: boolean;
  cameraKey: string;
  startTime: number | null;
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
    status: (event.status as AlarmItem['status']) || 'unresolved',
    severity: 'detection' as const,
    acknowledgedAt: event.acknowledgedAt ?? null,
    resolvedAt: event.resolvedAt ?? null,
    camera: event.camera,
  }));

  return { alarms, total };
}

export async function getAlarmMediaInfo(
  tenantId: string,
  alarmId: string
): Promise<AlarmMediaInfo | null> {
  const event = await prisma.event.findFirst({
    where: { id: alarmId, tenantId },
    select: {
      frigateId: true,
      hasSnapshot: true,
      hasClip: true,
      startTime: true,
      camera: {
        select: {
          frigateCameraKey: true,
        },
      },
    },
  });

  if (!event) {
    return null;
  }

  return {
    frigateId: event.frigateId,
    hasSnapshot: event.hasSnapshot,
    hasClip: event.hasClip,
    cameraKey: event.camera.frigateCameraKey,
    startTime: event.startTime ?? null,
  };
}

export async function acknowledgeAlarm(
  tenantId: string,
  alarmId: string
): Promise<AlarmItem | null> {
  const event = await prisma.event.findFirst({
    where: { id: alarmId, tenantId },
  });

  if (!event) {
    return null;
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      status: 'acknowledged',
      acknowledgedAt: event.acknowledgedAt ?? new Date(),
    },
    include: {
      camera: {
        select: {
          id: true,
          frigateCameraKey: true,
          label: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    frigateId: updated.frigateId,
    type: updated.type,
    label: updated.label,
    hasSnapshot: updated.hasSnapshot,
    hasClip: updated.hasClip,
    startTime: updated.startTime ?? null,
    endTime: updated.endTime ?? null,
    createdAt: updated.createdAt,
    status: (updated.status as AlarmItem['status']) || 'unresolved',
    severity: 'detection',
    acknowledgedAt: updated.acknowledgedAt ?? null,
    resolvedAt: updated.resolvedAt ?? null,
    camera: updated.camera,
  };
}

export async function resolveAlarm(
  tenantId: string,
  alarmId: string
): Promise<AlarmItem | null> {
  const event = await prisma.event.findFirst({
    where: { id: alarmId, tenantId },
  });

  if (!event) {
    return null;
  }

  const now = new Date();

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      status: 'resolved',
      acknowledgedAt: event.acknowledgedAt ?? now,
      resolvedAt: now,
    },
    include: {
      camera: {
        select: {
          id: true,
          frigateCameraKey: true,
          label: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    frigateId: updated.frigateId,
    type: updated.type,
    label: updated.label,
    hasSnapshot: updated.hasSnapshot,
    hasClip: updated.hasClip,
    startTime: updated.startTime ?? null,
    endTime: updated.endTime ?? null,
    createdAt: updated.createdAt,
    status: (updated.status as AlarmItem['status']) || 'unresolved',
    severity: 'detection',
    acknowledgedAt: updated.acknowledgedAt ?? null,
    resolvedAt: updated.resolvedAt ?? null,
    camera: updated.camera,
  };
}
