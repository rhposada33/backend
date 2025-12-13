/**
 * WebSocket Handler for Events
 * Real-time event streaming using WebSocket
 */

import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import type { WebSocket } from 'ws';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
  };
}

// Store active WebSocket connections by tenant
const activeConnections = new Map<string, Set<WebSocket>>();

/**
 * Handle WebSocket connection for events
 * URL: ws://localhost:3000/api/v1/events
 * Query: ?token=<JWT_TOKEN>
 */
export function handleEventWebSocket(
  ws: WebSocket,
  req: AuthenticatedRequest & { query: Record<string, string | string[]> }
) {
  console.log('🔌 WebSocket connection attempt');

  try {
    // 1. Extract and verify JWT token from query string
    const token = req.query.token as string;

    if (!token) {
      console.log('❌ WebSocket: No token provided');
      ws.close(1008, 'Token required');
      return;
    }

    // 2. Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtSecret as string) as {
        userId: string;
        email: string;
        tenantId: string;
        iat: number;
        exp: number;
      };
    } catch (error) {
      console.log('❌ WebSocket: Invalid token');
      ws.close(1008, 'Invalid token');
      return;
    }

    const userId = decoded.userId;
    const tenantId = decoded.tenantId;
    const email = decoded.email;

    console.log(`✅ WebSocket connected: ${email} (${userId})`);

    // 3. Track this connection by tenant
    if (!activeConnections.has(tenantId)) {
      activeConnections.set(tenantId, new Set());
    }
    activeConnections.get(tenantId)!.add(ws);

    // 4. Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to event stream',
        userId,
        email,
        tenantId,
        timestamp: new Date().toISOString(),
      })
    );

    // 5. Handle incoming messages from client
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log(`📨 WebSocket message from ${email}:`, data.type);

        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Client subscribing to specific channel
            ws.send(
              JSON.stringify({
                type: 'subscribed',
                channel: data.channel,
                message: `Subscribed to ${data.channel}`,
                timestamp: new Date().toISOString(),
              })
            );
            break;

          case 'unsubscribe':
            // Client unsubscribing from channel
            ws.send(
              JSON.stringify({
                type: 'unsubscribed',
                channel: data.channel,
                message: `Unsubscribed from ${data.channel}`,
                timestamp: new Date().toISOString(),
              })
            );
            break;

          case 'ping':
            // Keep-alive ping
            ws.send(
              JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString(),
              })
            );
            break;

          default:
            console.log(`⚠️  Unknown message type: ${data.type}`);
            ws.send(
              JSON.stringify({
                type: 'error',
                message: `Unknown message type: ${data.type}`,
                timestamp: new Date().toISOString(),
              })
            );
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Failed to parse message',
            timestamp: new Date().toISOString(),
          })
        );
      }
    });

    // 6. Handle connection close
    ws.on('close', () => {
      console.log(`🔌 WebSocket disconnected: ${email}`);
      const connections = activeConnections.get(tenantId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          activeConnections.delete(tenantId);
        }
      }
    });

    // 7. Handle errors
    ws.on('error', (error: Error) => {
      console.error('❌ WebSocket error:', error.message);
    });
  } catch (error) {
    console.error('❌ WebSocket connection error:', error);
    ws.close(1011, 'Server error');
  }
}

/**
 * Broadcast an event to all clients in a tenant
 * @param tenantId - Tenant ID to broadcast to
 * @param event - Event data to send
 */
export function broadcastEventToTenant(tenantId: string, event: any) {
  const connections = activeConnections.get(tenantId);
  if (!connections || connections.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'event',
    data: event,
    timestamp: new Date().toISOString(),
  });

  let successCount = 0;
  let failCount = 0;

  connections.forEach((ws) => {
    try {
      // WebSocket.OPEN = 1
      if (ws.readyState === 1) {
        ws.send(message);
        successCount++;
      }
    } catch (error) {
      console.error('Error broadcasting to client:', error);
      failCount++;
      connections.delete(ws);
    }
  });

  if (successCount > 0) {
    console.log(`📤 Event broadcasted to ${successCount} clients`);
  }
}

/**
 * Get active connection count for a tenant
 */
export function getActiveConnectionCount(tenantId: string): number {
  return activeConnections.get(tenantId)?.size ?? 0;
}

/**
 * Broadcast event to all active connections (for admin purposes)
 */
export function broadcastToAll(event: any) {
  let totalCount = 0;
  activeConnections.forEach((connections, tenantId) => {
    const message = JSON.stringify({
      type: 'event',
      data: event,
      timestamp: new Date().toISOString(),
    });

    connections.forEach((ws) => {
      try {
        // WebSocket.OPEN = 1
        if (ws.readyState === 1) {
          ws.send(message);
          totalCount++;
        }
      } catch (error) {
        connections.delete(ws);
      }
    });
  });

  console.log(`📤 Event broadcasted to ${totalCount} clients globally`);
}
