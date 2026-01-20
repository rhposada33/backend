/**
 * Frigate Server Router
 */

import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { authMiddleware } from '../../auth/middleware.js';
import {
  listFrigateServersAdmin,
  listTenantsAdmin,
  createFrigateServerAdmin,
  updateFrigateServerAdmin,
  deleteFrigateServerAdmin,
  setDefaultFrigateServer,
} from './controller.js';

export const frigateServerRouter = Router();

frigateServerRouter.get('/', authMiddleware, asyncHandler(listFrigateServersAdmin));
frigateServerRouter.get('/tenants', authMiddleware, asyncHandler(listTenantsAdmin));
frigateServerRouter.post('/', authMiddleware, asyncHandler(createFrigateServerAdmin));
frigateServerRouter.patch('/:id', authMiddleware, asyncHandler(updateFrigateServerAdmin));
frigateServerRouter.delete('/:id', authMiddleware, asyncHandler(deleteFrigateServerAdmin));
frigateServerRouter.patch('/:id/default', authMiddleware, asyncHandler(setDefaultFrigateServer));

export default frigateServerRouter;
