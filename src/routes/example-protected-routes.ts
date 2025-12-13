/**
 * Example: Using Auth Middleware in Routes
 * Copy patterns from here to implement your own protected routes
 */

import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth/index.js';
import { prisma } from '../db/client.js';

const exampleRouter = Router();

/**
 * Example 1: Get Current User Profile
 * Requires authentication
 */
exampleRouter.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        tenantId: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        ...user,
        tenantName: user.tenant.name,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * Example 2: List Tenant Users
 * Requires authentication + tenant access
 */
exampleRouter.get('/tenant/:tenantId/users', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { tenantId } = req.params;

    // Verify user has access to this tenant
    if (req.user.tenantId !== tenantId) {
      res.status(403).json({ error: 'Access denied to this tenant' });
      return;
    }

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * Example 3: Update User Email
 * Requires authentication + ownership or admin privileges
 */
exampleRouter.put('/users/:userId/email', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { userId } = req.params;
    const { email } = req.body;

    // Only allow users to update their own email (or admins)
    if (req.user.userId !== userId) {
      res.status(403).json({ error: 'Can only update your own email' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if new email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== userId) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email },
      select: {
        id: true,
        email: true,
        tenantId: true,
        createdAt: true,
      },
    });

    res.json({
      message: 'Email updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

/**
 * Example 4: List Cameras for Tenant
 * Protected route with tenant isolation
 */
exampleRouter.get('/cameras', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Automatically filter by user's tenant
    const cameras = await prisma.camera.findMany({
      where: { tenantId: req.user.tenantId },
      select: {
        id: true,
        frigateCameraKey: true,
        label: true,
        createdAt: true,
      },
    });

    res.json({ cameras });
  } catch (error) {
    console.error('List cameras error:', error);
    res.status(500).json({ error: 'Failed to list cameras' });
  }
});

/**
 * Example 5: Get Events for Specific Camera
 * Protected + tenant-scoped
 */
exampleRouter.get('/cameras/:cameraId/events', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { cameraId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    // Verify camera belongs to user's tenant
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
    });

    if (!camera) {
      res.status(404).json({ error: 'Camera not found' });
      return;
    }

    if (camera.tenantId !== req.user.tenantId) {
      res.status(403).json({ error: 'Access denied to this camera' });
      return;
    }

    // Get recent events for camera
    const events = await prisma.event.findMany({
      where: {
        cameraId,
        tenantId: req.user.tenantId,
      },
      select: {
        id: true,
        type: true,
        label: true,
        hasSnapshot: true,
        hasClip: true,
        startTime: true,
        endTime: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      camera: {
        id: camera.id,
        frigateCameraKey: camera.frigateCameraKey,
        label: camera.label,
      },
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

/**
 * Example 6: Using AuthenticatedRequest Type
 * Type-safe access to authenticated user
 */
exampleRouter.get('/verify', authMiddleware, (req: AuthenticatedRequest, res) => {
  // TypeScript knows req.user exists because of authMiddleware
  if (!req.user) {
    // This should never happen if middleware is applied correctly
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Full type safety here
  res.json({
    authenticated: true,
    userId: req.user.userId,
    tenantId: req.user.tenantId,
    email: req.user.email,
  });
});

export default exampleRouter;

/**
 * Usage in your main router:
 *
 * import exampleRouter from './routes/example.js';
 * app.use('/api/v1', exampleRouter);
 *
 * Then endpoints are available at:
 * - GET /api/v1/profile
 * - GET /api/v1/tenant/:tenantId/users
 * - PUT /api/v1/users/:userId/email
 * - GET /api/v1/cameras
 * - GET /api/v1/cameras/:cameraId/events
 * - GET /api/v1/verify
 */
