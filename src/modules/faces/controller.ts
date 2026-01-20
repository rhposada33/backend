/**
 * Faces Controller
 * Frigate face management endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import { AuthenticationError, ValidationError } from '../../middleware/errorHandler.js';
import * as faceService from './service.js';

export async function listFaces(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const faces = await faceService.listFaces(req.user.tenantId);
  res.status(200).json({ data: faces });
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
