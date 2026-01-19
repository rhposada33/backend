/**
 * Frigate Config Service
 * Regenerates cameras block in Frigate config.yaml from DB
 */

import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../db/client.js';
import { config } from '../../config/index.js';
import { ValidationError } from '../../middleware/errorHandler.js';

const DEFAULT_CONFIG_PATH = '/home/rafa/satelitrack/server/config/config.yaml';

const DEFAULT_ZONE_COORDS =
  '0.159,0.166,0.19,0.854,0.781,0.931,0.886,0.769,\n' +
  '          0.877,0.517,0.855,0.295,0.606,0.196';

function buildCameraBlock(camera: {
  frigateCameraKey: string;
  inputUrl: string;
  isEnabled: boolean;
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
}): string {
  const inputArgsValue = camera.inputArgs?.trim()
    ? camera.inputArgs.trim()
    : camera.isTestFeed
      ? '-re -stream_loop -1'
      : '';
  const inputArgs = inputArgsValue ? `          input_args: ${inputArgsValue}\n` : '';

  const roles = camera.roles?.trim()
    ? camera.roles.split(',').map((role) => role.trim()).filter(Boolean)
    : ['detect'];
  const rolesLines = roles.map((role) => `            - ${role}`).join('\n');

  const zoneName = camera.zoneName?.trim() || 'face';
  const zoneCoordinates = camera.zoneCoordinates?.trim() || DEFAULT_ZONE_COORDS;
  const zoneObjects = camera.zoneObjects?.trim()
    ? camera.zoneObjects.split(',').map((value) => value.trim()).filter(Boolean)
    : ['person', 'car', 'cat', 'dog'];
  const zoneObjectsLines = zoneObjects.map((value) => `          - ${value}`).join('\n');

  const reviewZones = camera.reviewRequiredZones?.trim()
    ? camera.reviewRequiredZones.split(',').map((value) => value.trim()).filter(Boolean)
    : [zoneName];
  const reviewZonesBlock =
    reviewZones.length === 1
      ? `        required_zones: ${reviewZones[0]}`
      : `        required_zones:\n${reviewZones.map((value) => `          - ${value}`).join('\n')}`;

  const zoneCoordinateLines = zoneCoordinates
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `          ${line}`)
    .join('\n');

  return `  ${camera.frigateCameraKey}:
    enabled: ${camera.isEnabled ? 'true' : 'false'}

    ffmpeg:
      inputs:
        - path: ${camera.inputUrl}
${inputArgs}          roles:
${rolesLines}

    detect:
      enabled: true
      width: ${camera.detectWidth}
      height: ${camera.detectHeight}
      fps: ${camera.detectFps}

    record:
      enabled: ${camera.recordEnabled ? 'true' : 'false'}

    snapshots:
      enabled: ${camera.snapshotsEnabled ? 'true' : 'false'}
      retain:
        default: ${camera.snapshotsRetainDays}

    motion:
      enabled: ${camera.motionEnabled ? 'true' : 'false'}

    zones:
      ${zoneName}:
        coordinates:
${zoneCoordinateLines}
        loitering_time: 2
        inertia: 3
        objects:
${zoneObjectsLines}

    review:
      alerts:
${reviewZonesBlock}
`;
}

function buildCamerasSection(
  cameras: Array<{
    frigateCameraKey: string;
    inputUrl: string;
    isEnabled: boolean;
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
  }>
): string {
  const blocks = cameras.map(buildCameraBlock).join('\n');
  return `cameras:\n${blocks}`;
}

function buildGo2RtcSection(
  cameras: Array<{
    frigateCameraKey: string;
    inputUrl: string;
    isTestFeed: boolean;
  }>
): string {
  const streams = cameras
    .map((camera) => {
      const source = camera.isTestFeed
        ? camera.inputUrl.startsWith('ffmpeg:')
          ? camera.inputUrl
          : `ffmpeg:${camera.inputUrl}`
        : camera.inputUrl;

      return `    ${camera.frigateCameraKey}:\n      - ${source}`;
    })
    .join('\n');

  return `go2rtc:\n  streams:\n${streams}\n`;
}

function replaceCamerasSection(contents: string, camerasSection: string): string {
  const regex = /^cameras:\n[\s\S]*?(?=^[A-Za-z_][\w-]*:\s*$|\Z)/m;
  if (regex.test(contents)) {
    return contents.replace(regex, camerasSection.trimEnd() + '\n');
  }

  return `${contents.trimEnd()}\n\n${camerasSection.trimEnd()}\n`;
}

function replaceGo2RtcSection(contents: string, go2rtcSection: string): string {
  const regex = /^go2rtc:\n[\s\S]*?(?=^[A-Za-z_][\w-]*:\s*$|\Z)/m;
  if (regex.test(contents)) {
    return contents.replace(regex, go2rtcSection.trimEnd() + '\n');
  }

  return `${contents.trimEnd()}\n\n${go2rtcSection.trimEnd()}\n`;
}

export async function regenerateFrigateConfig(): Promise<{ path: string; count: number }> {
  const configPath = config.frigateConfigPath || DEFAULT_CONFIG_PATH;

  const cameras = await prisma.camera.findMany({
    orderBy: { frigateCameraKey: 'asc' },
    select: {
      frigateCameraKey: true,
      inputUrl: true,
      isEnabled: true,
      isTestFeed: true,
      inputArgs: true,
      roles: true,
      recordEnabled: true,
      snapshotsEnabled: true,
      snapshotsRetainDays: true,
      motionEnabled: true,
      detectWidth: true,
      detectHeight: true,
      detectFps: true,
      zoneName: true,
      zoneCoordinates: true,
      zoneObjects: true,
      reviewRequiredZones: true,
    },
  });

  const missingInput = cameras.filter((camera) => !camera.inputUrl || camera.inputUrl.trim().length === 0);
  if (missingInput.length > 0) {
    throw new ValidationError(
      `Missing inputUrl for cameras: ${missingInput.map((camera) => camera.frigateCameraKey).join(', ')}`
    );
  }

  const camerasSection = buildCamerasSection(
    cameras.map((camera) => ({
      frigateCameraKey: camera.frigateCameraKey,
      inputUrl: camera.inputUrl as string,
      isEnabled: camera.isEnabled,
      isTestFeed: camera.isTestFeed,
      inputArgs: camera.inputArgs,
      roles: camera.roles,
      recordEnabled: camera.recordEnabled,
      snapshotsEnabled: camera.snapshotsEnabled,
      snapshotsRetainDays: camera.snapshotsRetainDays,
      motionEnabled: camera.motionEnabled,
      detectWidth: camera.detectWidth,
      detectHeight: camera.detectHeight,
      detectFps: camera.detectFps,
      zoneName: camera.zoneName,
      zoneCoordinates: camera.zoneCoordinates,
      zoneObjects: camera.zoneObjects,
      reviewRequiredZones: camera.reviewRequiredZones,
    }))
  );

  const go2rtcSection = buildGo2RtcSection(
    cameras.map((camera) => ({
      frigateCameraKey: camera.frigateCameraKey,
      inputUrl: camera.inputUrl as string,
      isTestFeed: camera.isTestFeed,
    }))
  );

  const contents = await fs.readFile(configPath, 'utf8');
  const updated = replaceGo2RtcSection(
    replaceCamerasSection(contents, camerasSection),
    go2rtcSection
  );

  await fs.writeFile(configPath, updated, 'utf8');

  return { path: path.resolve(configPath), count: cameras.length };
}
