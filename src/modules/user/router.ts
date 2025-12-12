/**
 * User Auth Router
 * Routes for user authentication endpoints
 */

import { Router } from 'express';
import { register, login } from './controller.js';

export const authRouter = Router();

// Public endpoints (no authentication required)
authRouter.post('/register', register);
authRouter.post('/login', login);
