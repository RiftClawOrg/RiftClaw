#!/usr/bin/env node
/**
 * RiftClaw Relay Server v0.2.0
 * 
 * Pure WebSocket relay - no static file serving.
 * Worlds connect to this relay and discover each other.
 */

const WebSocket = require('ws');

// Configuration
const PORT = process.env.PORT || 8765;
const HOST = process.env.HOST || '0.0.0.0';

// State management
const connections = new Map();
const worlds = new Map();

// Utility functions
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTimestamp() {
  return Date.now() / 1000;
}

function createMessage(type, payload = {}) {
  return JSON.stringify({
    type,
    timestamp: getTimestamp(),
    ...payload
  });
}

// Message handlers
const handlers = {
  // World registration
  register_world(ws, message) {
    const conn = connections.get(ws);
    if (!conn) return;
    
    const { world_name, world_url, display_name } = message;
    
    console.log(`[Register] World '${world_name}' registering from ${conn.id}`);
    
    // Store world connection
    worlds.set(world_name, {
      ws: ws,
      url: world_url,
      displayName: display_name || world_name,
      registeredAt: Date.now()
    });
    
    conn.worldName = world_name;
    conn.isWorld = true;
    
    ws.send(createMessage('register_confirm', {
      world_name: world_name,
      status: 'registered'
    }));
    
    console.log(`[Register] World '${world_name}' now available for discovery`);
    console.log(`[Stats] Total worlds: ${worlds.size}`);
  },

  // Agent requesting portal list
  discover(ws, message) {
    const conn = connections.get(ws);
    if (!conn) return;

    console.log(`[Discover] Agent ${message.agent_id} discovering portals`);
    console.log(`[Discover] Connection: ${conn.id}, world: ${conn.worldName || 'agent'}`);
    
    const portals = [];
    const requestingWorld = conn.worldName;
    
    // Add registered worlds (exclude self)
    worlds.forEach((worldData, worldId) => {
      if (worldId === requestingWorld) {
        console.log(`[Discover] Skipping self: ${worldId}`);
        return;
      }
      if (worldData.ws.readyState === WebSocket.OPEN) {
        portals.push({
          portal_id: `portal_${worldId}_01`,
          name: worldData.displayName || `${worldId} Gateway`,
          destination_world: worldId,
          destination_url: worldData.url,
          position: { x: 0, y: 0, z: 0 },
          requires_auth: false,
          metadata: { registered: true }
        });
      }
    });

    ws.send(createMessage('discover_response', { 
      portals,
      registered_worlds: worlds.size
    }));
    
    console.log(`[Discover] Sent ${portals.length} portals to ${message.agent_id}`);
  },

  // Agent requesting handoff to another world
  handoff_request(ws, message) {
    const conn = connections.get(ws);
    if (!conn) return;

    const { portal_id, passport } = message;
    const targetWorld = passport?.target_world;
    
    console.log(`[Handoff] Agent ${message.agent_id} requesting entry to ${targetWorld}`);

    // Check if target world is registered
    if (targetWorld && worlds.has(targetWorld)) {
      const worldData = worlds.get(targetWorld);
      
      try {
        worldData.ws.send(createMessage('handoff_request', {
          portal_id: portal_id,
          passport: passport,
          from_agent: message.agent_id
        }));
        
        console.log(`[Handoff] Forwarded to ${targetWorld}`);
        
        setTimeout(() => {
          ws.send(createMessage('handoff_confirm', {
            passport: passport,
            target_url: worldData.url
          }));
        }, 500);
        
        return;
      } catch (e) {
        console.error(`[Handoff] Error forwarding:`, e.message);
      }
    }

    ws.send(createMessage('handoff_rejected', {
      reason: 'unknown_destination',
      details: `World '${targetWorld}' not found`
    }));
  },

  // Target world acknowledging handoff
  handoff_confirm(ws, message) {
    const conn = connections.get(ws);
    const worldName = conn?.worldName || 'unknown';
    console.log(`[Handoff] ${worldName} acknowledged`);
  },

  // Keep-alive ping
  ping(ws, message) {
    ws.send(createMessage('pong', { timestamp: getTimestamp() }));
  },

  // Default handler
  default(ws, message) {
    console.log(`[Unknown] Message type: ${message.type}`);
    ws.send(createMessage('error', {
      code: 'UNKNOWN_TYPE',
      message: `Unknown message type: ${message.type}`
    }));
  }
};

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT, host: HOST });

console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║     RiftClaw Relay Server v0.2.0                 ║
║                                                  ║
║     Pure WebSocket - No Static Files             ║
║                                                  ║
╚══════════════════════════════════════════════════╝

WebSocket: wss://${HOST}:${PORT}
Max connections: 100

Worlds should connect to this relay and register.
No HTML is served from this endpoint.

Press Ctrl+C to stop
`);

// Handle connections
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const connectionId = generateId();

  console.log(`[Connect] ${clientIp} connected (ID: ${connectionId})`);

  connections.set(ws, {
    id: connectionId,
    ip: clientIp,
    connectedAt: Date.now(),
    agentId: null,
    worldName: null,
    isWorld: false
  });

  ws.send(createMessage('welcome', {
    world_name: 'RiftClaw Relay',
    version: '0.2.0',
    capabilities: ['portals', 'relay'],
    relay_id: connectionId
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const conn = connections.get(ws);

      if (message.agent_id && !conn.agentId) {
        conn.agentId = message.agent_id;
      }

      const handler = handlers[message.type] || handlers.default;
      handler(ws, message);

    } catch (e) {
      console.error(`[Error] Failed to parse message:`, e.message);
    }
  });

  ws.on('close', (code, reason) => {
    const conn = connections.get(ws);
    console.log(`[Disconnect] ${conn?.id || 'unknown'} closed (${code})`);
    
    if (conn?.worldName) {
      worlds.delete(conn.worldName);
      console.log(`[Unregister] World '${conn.worldName}' removed`);
    }
    
    connections.delete(ws);
  });

  ws.on('error', (err) => {
    console.error(`[Error] WebSocket error:`, err.message);
  });
});

// Periodic stats
setInterval(() => {
  console.log(`[Stats] Connections: ${connections.size}, Worlds: ${worlds.size}, Uptime: ${Math.floor(process.uptime())}s`);
}, 60000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Closing relay server...');
  connections.forEach((conn, ws) => {
    ws.close(1001, 'Server shutting down');
  });
  wss.close(() => {
    console.log('[Shutdown] Relay server stopped');
    process.exit(0);
  });
});
