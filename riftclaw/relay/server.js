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
  // World registration (new!)
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
  },

  // Agent requesting portal list
  discover(ws, message) {
    const conn = connections.get(ws);
    if (!conn) return;

    console.log(`[Discover] Agent ${message.agent_id} discovering portals`);
    
    // Get the requesting world's name (if it's a world)
    const requestingWorld = conn.worldName;
    console.log(`[Discover] Requesting world: ${requestingWorld || 'agent'}`);
    
    // Build portal list from registered worlds AND config worlds
    const portals = [];
    
    // Add registered worlds (exclude self)
    worlds.forEach((worldData, worldId) => {
      // Skip if this is the requesting world (don't show portal to self)
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
    
    // Add config worlds (for backwards compatibility)
    Object.entries(config.worlds).forEach(([worldId, worldUrl]) => {
      // Skip if already registered or if it's the requesting world
      if (!worlds.has(worldId) && worldId !== requestingWorld) {
        portals.push({
          portal_id: `portal_${worldId}_01`,
          name: `${worldId} Gateway`,
          destination_world: worldId,
          destination_url: worldUrl,
          position: { x: 0, y: 0, z: 0 },
          requires_auth: false,
          metadata: { fromConfig: true }
        });
      }
    });

    ws.send(createMessage('discover_response', { 
      portals,
      registered_worlds: worlds.size
    }));
  },

  // Agent requesting handoff to another world
  handoff_request(ws, message) {
    const conn = connections.get(ws);
    if (!conn) return;

    const { portal_id, passport } = message;
    const targetWorld = passport?.target_world;
    
    console.log(`[Handoff] Agent ${message.agent_id} requesting entry to ${targetWorld || portal_id}`);

    // Check if target world is registered
    if (targetWorld && worlds.has(targetWorld)) {
      const worldData = worlds.get(targetWorld);
      
      // Forward handoff to target world
      try {
        worldData.ws.send(createMessage('handoff_request', {
          portal_id: portal_id,
          passport: passport,
          from_agent: message.agent_id
        }));
        
        console.log(`[Handoff] Forwarded to registered world '${targetWorld}'`);
        
        // Wait for response (in a real implementation, we'd track this)
        setTimeout(() => {
          ws.send(createMessage('handoff_confirm', {
            passport: passport,
            target_url: worldData.url
          }));
        }, 500);
        
        return;
      } catch (e) {
        console.error(`[Handoff] Error forwarding to ${targetWorld}:`, e.message);
      }
    }

    // Unknown destination
    ws.send(createMessage('handoff_rejected', {
      reason: 'unknown_destination',
      details: `World '${targetWorld}' not found in relay registry`
    }));
  },

  // Target world acknowledging handoff
  handoff_confirm(ws, message) {
    // Target world is confirming receipt of handoff_request
    // The relay already sent its own confirm after forwarding, so we just log this
    const conn = connections.get(ws);
    const worldName = conn?.worldName || 'unknown';
    console.log(`[Handoff] ${worldName} acknowledged handoff (tracking not implemented)`);
    // Don't broadcast this - the relay already handled the confirm
  },

  // Keep-alive ping from worlds to prevent idle timeout
  ping(ws, message) {
    ws.send(createMessage('pong', { timestamp: getTimestamp() }));
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
    
    // Clean up registered world
    if (conn?.worldName) {
      worlds.delete(conn.worldName);
      console.log(`[Disconnect] World '${conn.worldName}' unregistered`);
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
    worlds: worlds.size,
    uptime: process.uptime()
  };
  console.log(`[Stats] Connections: ${stats.connections}, Agents: ${stats.agents}, Worlds: ${stats.worlds}, Uptime: ${Math.floor(stats.uptime)}s`);
  
  // List registered worlds
  if (worlds.size > 0) {
    console.log(`[Worlds] Registered: ${Array.from(worlds.keys()).join(', ')}`);
  }
}, 60000);
