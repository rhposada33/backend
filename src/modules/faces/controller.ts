/**
 * Faces Controller
 * Frigate face management endpoints
 */

import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import { AuthenticationError, ValidationError } from '../../middleware/errorHandler.js';
import { config } from '../../config/index.js';
import * as faceService from './service.js';

export async function listFaces(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const faces = await faceService.listFaces(req.user.tenantId);
  res.status(200).json({ data: faces });
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg';
  }
  if (ext === '.png') {
    return 'image/png';
  }
  if (ext === '.webp') {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

export async function getFaceImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { name, filename } = req.params as { name?: string; filename?: string };
  if (!name || !name.trim()) {
    throw new ValidationError('Face name is required');
  }
  if (!filename || !filename.trim()) {
    throw new ValidationError('Face image filename is required');
  }
  if (!config.frigateMediaPath) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'FRIGATE_MEDIA_PATH is not configured',
    });
    return;
  }

  const safeName = path.basename(name.trim());
  const safeFile = path.basename(filename.trim());
  const filePath = path.join(config.frigateMediaPath, 'clips', 'faces', safeName, safeFile);

  try {
    await fs.promises.stat(filePath);
  } catch {
    res.status(404).json({
      error: 'Not Found',
      message: 'Face image not found',
    });
    return;
  }

  res.setHeader('Content-Type', getContentType(filePath));
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    console.error('Failed to read face image', { filePath, error });
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to read face image',
      });
    } else {
      res.end();
    }
  });

  stream.pipe(res);
}

export async function createFace(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { name } = req.params;
  if (!name || !name.trim()) {
    throw new ValidationError('Face name is required');
  }

  const result = await faceService.createFace(req.user.tenantId, name.trim());
  res.status(201).json({ data: result });
}

export async function registerFace(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { name } = req.params;
  if (!name || !name.trim()) {
    throw new ValidationError('Face name is required');
  }

  const file = (req as any).file as { buffer: Buffer; originalname: string; mimetype: string } | undefined;
  if (!file) {
    throw new ValidationError('Face image is required');
  }

  const result = await faceService.registerFaceImage(req.user.tenantId, name.trim(), {
    buffer: file.buffer,
    filename: file.originalname,
    mimetype: file.mimetype,
  });

  res.status(200).json({ data: result });
}

export async function trainFace(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { name } = req.params;
  if (!name || !name.trim()) {
    throw new ValidationError('Face name is required');
  }

  const result = await faceService.trainFace(req.user.tenantId, name.trim());
  res.status(200).json({ data: result });
}

export async function deleteFace(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { name } = req.params;
  if (!name || !name.trim()) {
    throw new ValidationError('Face name is required');
  }

  const result = await faceService.deleteFace(req.user.tenantId, name.trim());
  res.status(200).json({ data: result });
}

export async function renameFace(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { oldName } = req.params as { oldName: string };
  const { newName } = req.body as { newName?: string };

  if (!oldName || !oldName.trim()) {
    throw new ValidationError('Old name is required');
  }

  if (!newName || !newName.trim()) {
    throw new ValidationError('New name is required');
  }

  const result = await faceService.renameFace(req.user.tenantId, oldName.trim(), newName.trim());
  res.status(200).json({ data: result });
}
