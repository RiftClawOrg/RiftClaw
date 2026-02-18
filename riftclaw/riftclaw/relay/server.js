#!/usr/bin/env node
/**
 * RiftClaw Reference Relay Server v0.1.0
 * 
 * A WebSocket relay that enables cross-world agent traversal
 * by forwarding messages between connected worlds and agents.
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 8765;
const HOST = process.env.HOST || '0.0.0.0';
const CONFIG_PATH = process.env.CONFIG || path.join(__dirname, 'config.json');

// Load or create default config
let config = {
  relay: {
    name: "RiftClaw Relay",
    version: "0.1.0",
    maxConnections: 100,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 30
  },
  worlds: {
    // Add world URLs here
    // "lobby": "wss://molt.space/lobby",
  }
};

if (fs.existsSync(CONFIG_PATH)) {
  try {
    const userConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config = { ...config, ...userConfig };
    console.log(`[Config] Loaded from ${CONFIG_PATH}`);
  } catch (e) {
    console.error(`[Config] Error loading ${CONFIG_PATH}:`, e.message);
  }
}

// State management
const connections = new Map(); // ws -> connection info
const worlds = new Map(); // worldId -> world connection
const agentSessions = new Map(); // agentId -> session data

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

// Rate limiter (simple in-memory)
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 30) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map(); // ws -> [{timestamp, count}]
  }

  check(ws) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(ws)) {
      this.requests.set(ws, []);
    }
    
    const history = this.requests.get(ws);
    // Clean old entries
    const recent = history.filter(t => t > windowStart);
    this.requests.set(ws, recent);
    
    if (recent.length >= this.maxRequests) {
      return false;
    }
    
    recent.push(now);
    return true;
  }

  remove(ws) {
    this.requests.delete(ws);
  }
}

const rateLimiter = new RateLimiter(
  config.relay.rateLimitWindowMs,
  config.relay.rateLimitMaxRequests
);

// Message handlers
const handlers = {
  // Agent requesting portal list
  discover(ws, message) {
    const conn = connections.get(ws);
    if (!conn) return;

    console.log(`[Discover] Agent ${message.agent_id} discovering portals`);
    
    // Build portal list from known worlds
    const portals = [];
    worlds.forEach((worldConn, worldId) => {
      if (worldConn.readyState === WebSocket.OPEN) {
        portals.push({
          portal_id: `portal_${worldId}_01`,
          name: `${worldId} Gateway`,
          destination_world: worldId,
          destination_url: config.worlds[worldId],
          position: { x: 0, y: 0, z: 0 },
          requires_auth: false,
          metadata: {}
        });
      }
    });

    // Add echo test portal if no worlds configured
    if (portals.length === 0) {
      portals.push({
        portal_id: "portal_echo_test",
        name: "Echo Test Portal",
        destination_world: "echo_test",
        destination_url: "wss://echo.websocket.org",
        position: { x: 0, y: 0, z: 0 },
        requires_auth: false,
        metadata: { note: "Test server for development" }
      });
    }

    ws.send(createMessage('discover_response', { portals }));
  },

  // Agent requesting handoff to another world
  handoff_request(ws, message) {
    const conn = connections.get(ws);
    if (!conn) return;

    const { portal_id, passport } = message;
    console.log(`[Handoff] Agent ${message.agent_id} requesting entry to ${portal_id}`);

    // Extract world ID from portal_id (portal_<world>_01)
    const worldId = portal_id.replace('portal_', '').replace(/_\d+$/, '');
    
    // Check if this is the echo test portal
    if (portal_id === 'portal_echo_test') {
      console.log(`[Handoff] Routing to echo test server`);
      
      // Simulate handoff to echo server
      setTimeout(() => {
        ws.send(createMessage('handoff_confirm', {
          new_pos: { x: 0, y: 1, z: 0 },
          granted_capabilities: ['movement', 'chat'],
          world_state_hash: 'sha256:test'
        }));
      }, 500);
      
      return;
    }

    // Check if world is known
    if (!config.worlds[worldId]) {
      ws.send(createMessage('handoff_rejected', {
        reason: 'unknown_destination',
        details: `World '${worldId}' not found in relay registry`
      }));
      return;
    }

    // Try to forward to destination world
    const destUrl = config.worlds[worldId];
    console.log(`[Handoff] Forwarding passport to ${destUrl}`);

    // In a full implementation, this would:
    // 1. Open connection to destination world
    // 2. Send the passport
    // 3. Wait for confirmation
    // 4. Relay response back to agent

    // For now, simulate success
    setTimeout(() => {
      ws.send(createMessage('handoff_confirm', {
        new_pos: { x: 5, y: 1, z: 0 },
        granted_capabilities: ['movement', 'inventory', 'trade'],
        world_state_hash: `sha256:${Date.now()}`
      }));
    }, 1000);
  },

  // Default handler for unknown types
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
║     RiftClaw Reference Relay Server v0.1.0       ║
║                                                  ║
╚══════════════════════════════════════════════════╝

Listening on: ws://${HOST}:${PORT}
Max connections: ${config.relay.maxConnections}
Rate limit: ${config.relay.rateLimitMaxRequests} req/${config.relay.rateLimitWindowMs}ms

Press Ctrl+C to stop
`);

// Handle connections
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const connectionId = generateId();

  console.log(`[Connect] ${clientIp} connected (ID: ${connectionId})`);

  // Check max connections
  if (connections.size >= config.relay.maxConnections) {
    ws.send(createMessage('error', {
      code: 'SERVER_FULL',
      message: 'Relay at maximum capacity'
    }));
    ws.close(1013, 'Server Full');
    return;
  }

  // Store connection info
  connections.set(ws, {
    id: connectionId,
    ip: clientIp,
    connectedAt: Date.now(),
    agentId: null,
    state: 'connected'
  });

  // Send welcome
  ws.send(createMessage('welcome', {
    world_name: config.relay.name,
    version: config.relay.version,
    capabilities: ['portals', 'relay'],
    relay_id: connectionId
  }));

  // Handle messages
  ws.on('message', (data) => {
    // Rate limit check
    if (!rateLimiter.check(ws)) {
      ws.send(createMessage('error', {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please slow down'
      }));
      return;
    }

    try {
      const message = JSON.parse(data);
      const conn = connections.get(ws);

      console.log(`[Message] Type: ${message.type} from ${conn?.id || 'unknown'}`);

      // Store agent ID from first message
      if (message.agent_id && !conn.agentId) {
        conn.agentId = message.agent_id;
        agentSessions.set(message.agent_id, {
          connectionId: conn.id,
          connectedAt: conn.connectedAt,
          lastSeen: Date.now()
        });
      }

      // Route to handler
      const handler = handlers[message.type] || handlers.default;
      handler(ws, message);

    } catch (e) {
      console.error(`[Error] Failed to parse message:`, e.message);
      ws.send(createMessage('error', {
        code: 'MALFORMED_MESSAGE',
        message: 'Invalid JSON'
      }));
    }
  });

  // Handle close
  ws.on('close', (code, reason) => {
    const conn = connections.get(ws);
    console.log(`[Disconnect] ${conn?.id || 'unknown'} closed (${code}): ${reason}`);
    
    // Clean up
    if (conn?.agentId) {
      agentSessions.delete(conn.agentId);
    }
    rateLimiter.remove(ws);
    connections.delete(ws);
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`[Error] WebSocket error:`, err.message);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Closing relay server...');
  
  // Close all connections
  connections.forEach((conn, ws) => {
    ws.close(1001, 'Server shutting down');
  });
  
  wss.close(() => {
    console.log('[Shutdown] Relay server stopped');
    process.exit(0);
  });
});

// Periodic status log
setInterval(() => {
  const stats = {
    connections: connections.size,
    agents: agentSessions.size,
    uptime: process.uptime()
  };
  console.log(`[Stats] Connections: ${stats.connections}, Agents: ${stats.agents}, Uptime: ${Math.floor(stats.uptime)}s`);
}, 60000);
 
