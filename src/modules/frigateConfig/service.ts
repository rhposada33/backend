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
}): string {
  const inputArgs = camera.isTestFeed
    ? '          input_args: -re -stream_loop -1\n'
    : '';

  return `  ${camera.frigateCameraKey}:
    enabled: ${camera.isEnabled ? 'true' : 'false'}

    ffmpeg:
      inputs:
        - path: ${camera.inputUrl}
${inputArgs}          roles:
            - detect

    detect:
      enabled: true
      width: 320
      height: 180
      fps: 5

    record:
      enabled: true

    snapshots:
      enabled: true
      retain:
        default: 10

    motion:
      enabled: true

    zones:
      face:
        coordinates:
          ${DEFAULT_ZONE_COORDS}
        loitering_time: 2
        inertia: 3
        objects:
          - person
          - car
          - cat
          - dog

    review:
      alerts:
        required_zones: face
`;
}

function buildCamerasSection(cameras: Array<{ frigateCameraKey: string; inputUrl: string; isEnabled: boolean; isTestFeed: boolean; }>): string {
  const blocks = cameras.map(buildCameraBlock).join('\n');
  return `cameras:\n${blocks}`;
}

function replaceCamerasSection(contents: string, camerasSection: string): string {
  const regex = /^cameras:\n[\s\S]*?(?=^[A-Za-z_][\w-]*:\s*$|\Z)/m;
  if (regex.test(contents)) {
    return contents.replace(regex, camerasSection.trimEnd() + '\n');
  }

  return `${contents.trimEnd()}\n\n${camerasSection.trimEnd()}\n`;
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
    }))
  );

  const contents = await fs.readFile(configPath, 'utf8');
  const updated = replaceCamerasSection(contents, camerasSection);

  await fs.writeFile(configPath, updated, 'utf8');

  return { path: path.resolve(configPath), count: cameras.length };
}
