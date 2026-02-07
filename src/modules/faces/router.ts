/**
 * Faces Router
 * Frigate face management endpoints
 */

import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../auth/middleware.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  listFaces,
  listTrainFaces,
  createFace,
  registerFace,
  trainFace,
  deleteFace,
  renameFace,
  getFaceImage,
  deleteFaceImage,
  reprocessFace,
} from './controller.js';

export const facesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

facesRouter.get('/', authMiddleware, asyncHandler(listFaces));
facesRouter.get('/train', authMiddleware, asyncHandler(listTrainFaces));
facesRouter.get('/:name/images/:filename', authMiddleware, asyncHandler(getFaceImage));
facesRouter.delete('/:name/images/:filename', authMiddleware, asyncHandler(deleteFaceImage));
facesRouter.post('/:name/create', authMiddleware, asyncHandler(createFace));
facesRouter.post('/:name/register', authMiddleware, upload.single('file'), asyncHandler(registerFace));
facesRouter.post('/train/:name/classify', authMiddleware, asyncHandler(trainFace));
facesRouter.post('/:name/delete', authMiddleware, asyncHandler(deleteFace));
facesRouter.put('/:oldName/rename', authMiddleware, asyncHandler(renameFace));
facesRouter.post('/reprocess', authMiddleware, asyncHandler(reprocessFace));

export default facesRouter;
