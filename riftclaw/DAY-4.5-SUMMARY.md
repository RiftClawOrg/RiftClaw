# RiftClaw Day 4.5 - Cross-Server World Traversal Summary

## 🎯 Mission Accomplished

**Primary Goal:** Enable seamless bidirectional travel between local Limbo World and remote Replit-hosted Lobby World.

**Status:** ✅ **COMPLETE** - Users can now travel back and forth multiple times without issues.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        RiftClaw Relay                           │
│              wss://riftclaw-relay.replit.app                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Pure WebSocket Message Router (Node.js + ws library)   │   │
│  │  • World registration                                   │   │
│  │  • Portal discovery                                     │   │
│  │  • Handoff routing                                      │   │
│  │  • No static file serving (separated concern)           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↑↓ WebSocket
        ┌─────────────────────┴─────────────────────┐
        │                                           │
   ┌────▼────┐                                 ┌────▼────┐
   │  LOBBY  │                                 │  LIMBO  │
   │  WORLD  │◄───────────────────────────────►│  WORLD  │
   │(Replit) │     Cross-Server Traversal      │(Local)  │
   └─────────┘                                 └─────────┘
   https://rift-claw--riftclaw.replit.app/     http://localhost:8000/
                /lobby.html                          /limbo.html
```

---

## 🔧 Technical Implementation Details

### 1. Relay Server (riftclaw-relay.replit.app)

**File:** `riftclaw/relay/server-v2.js`

**Key Components:**
- **Connection Management:** `Map<ws, ConnectionInfo>` tracks all WebSocket connections
- **World Registry:** `Map<worldName, WorldData>` stores registered worlds
- **Message Router:** Routes `handoff_request` to target world WebSocket

**Protocol Messages:**
```javascript
// World Registration
{
  type: "register_world",
  world_name: "lobby",
  world_url: "https://...",
  display_name: "Replit Lobby"
}

// Portal Discovery
{
  type: "discover",
  agent_id: "limbo-..."
}

// Discover Response
{
  type: "discover_response",
  portals: [{
    portal_id: "portal_lobby_01",
    name: "Replit Lobby",
    destination_world: "lobby",
    destination_url: "https://..."
  }],
  registered_worlds: 2
}

// Handoff Request (Travel)
{
  type: "handoff_request",
  portal_id: "portal_lobby_01",
  passport: {
    agent_id: "...",
    source_world: "limbo",
    target_world: "lobby",
    inventory: "[...]",
    position: {x, y, z}
  }
}
```

**Self-Discovery Prevention:**
```javascript
// Discover handler skips requesting world
if (worldId === requestingWorld) {
  console.log(`[Discover] Skipping self: ${worldId}`);
  return;
}
```

### 2. World Clients (Lobby & Limbo)

**Connection Strategy:**
```javascript
// Configurable relay URL
const RELAY_URL = 'wss://riftclaw-relay.replit.app';

// Auto-reconnect on disconnect
state.ws.onclose = () => {
  setTimeout(connectToRelay, 3000); // Retry every 3s
};
```

**Keep-Alive Mechanism:**
```javascript
// Ping every 15 seconds
setInterval(() => sendMessage('ping'), 15000);

// Re-register every 60 seconds (prevents stale entries)
setInterval(() => {
  sendMessage('register_world', {...});
}, 60000);
```

**Portal Discovery Flow:**
1. World connects to relay
2. Sends `register_world` with name, URL, display name
3. Relay confirms with `register_confirm`
4. World sends `discover` to get available portals
5. Relay returns list of OTHER worlds (excludes self)
6. World spawns 3D portal meshes for each discovered world

### 3. Cross-Server Handoff (The Magic)

**Travel Flow:**
```
1. Player in Limbo walks into Lobby portal
   ↓
2. Limbo sends handoff_request to relay
   ↓
3. Relay forwards to Lobby's WebSocket
   ↓
4. Lobby opens new browser tab with destination URL
   ↓
5. Limbo shows "Travel Complete" screen (stays registered)
   ↓
6. Player arrives in Lobby (new tab)
   ↓
7. Lobby saves source info for return
   ↓
8. Player presses 'O' to return
   ↓
9. Lobby opens Limbo URL in new tab
   ↓
10. Cycle repeats!
```

**Passport System:**
```javascript
const passport = {
  agent_id: "unique-id",
  agent_name: "PlayerName",
  source_world: "limbo",
  source_url: "http://localhost:8000/limbo.html",
  target_world: "lobby",
  target_url: "https://rift-claw--riftclaw.replit.app/lobby.html",
  inventory: JSON.stringify(items),  // Persists across worlds!
  position: {x, y, z},               // Entry point
  timestamp: Date.now() / 1000
};
```

**Inventory Persistence:**
- Passed via URL parameter: `?inventory=URL_ENCODED_JSON`
- Loaded on world init: `inventory.fromJSON(urlParams)`
- Stackable items (x999 per stack)
- 8-slot inventory with emoji icons

### 4. Return Menu System (Lobby)

**Implementation:**
- Press 'O' key opens return portal menu
- Shows auto-saved source world (where you came from)
- Supports adding custom destinations
- All destinations stored in localStorage

**Menu UI:**
```
┌─────────────────────────────┐
│  🌀 Return Portal        ×  │
├─────────────────────────────┤
│  🏠 Local Limbo        DEFAULT│
│    http://localhost:8000/... │
├─────────────────────────────┤
│  🌐 Add Custom Destination   │
│  [Name: _______]             │
│  [URL: ________]             │
│  [Add Destination]           │
└─────────────────────────────┘
```

---

## 🐛 Bugs Fixed & Solutions

### Bug 1: Ghost Connections
**Problem:** Opening relay URL in browser tab auto-registered as "lobby"
**Solution:** Separated relay (WebSocket only) from world hosting (HTTP only)

### Bug 2: Tab Closing Killed Connections
**Problem:** `window.close()` unregistered world from relay
**Solution:** Don't close source tab; show "Travel Complete" screen instead

### Bug 3: Worlds Going Stale
**Problem:** Idle worlds disconnected after ~60s
**Solution:** Aggressive keep-alive (ping every 15s) + re-registration (every 60s)

### Bug 4: Unicode in Inventory
**Problem:** `btoa()` failed on emoji inventory items
**Solution:** `btoa(unescape(encodeURIComponent(json)))`

### Bug 5: File:// URL Blocking
**Problem:** Browser blocks opening file:// URLs from remote origins
**Solution:** Serve Limbo via `http://localhost:8000` (provided `start-limbo.bat`)

---

## 📁 Files Created/Modified

### New Files
- `riftclaw/relay/server-v2.js` - Pure WebSocket relay
- `riftclaw/ARCHITECTURE-v2.md` - Deployment guide
- `riftclaw/demos/threejs/start-limbo.bat` - Windows launcher

### Modified Files
- `riftclaw/demos/threejs/lobby.html` - Configurable relay, return menu, keep-alive
- `riftclaw/demos/threejs/limbo.html` - Configurable relay, reconnect button, keep-alive
- `riftclaw/demos/threejs/*.html` - All worlds updated with consistent portal effects

---

## 🎮 User Experience

### Setup (One-Time)
1. Deploy relay to `riftclaw-relay.replit.app`
2. Deploy worlds to `rift-claw--riftclaw.replit.app`
3. Friend downloads `limbo.html` + `start-limbo.bat`
4. Double-click `start-limbo.bat` → Opens `http://localhost:8000/limbo.html`

### Daily Use
1. Open Limbo locally
2. Walk through portal → Opens Lobby in new tab
3. Explore, chat, trade
4. Press 'O' → Select Limbo → Return home
5. Repeat!

### Features Working
- ✅ Bidirectional travel (Limbo ↔ Lobby)
- ✅ Inventory persistence across worlds
- ✅ Multiple trips without refreshing
- ✅ Auto-reconnect on disconnect
- ✅ Manual reconnect button (Ctrl+R)
- ✅ Color-coded portals per world
- ✅ Particle effects and portal sounds
- ✅ Return menu with custom destinations

---

## 📊 Current State

| Component | Status | URL |
|-----------|--------|-----|
| Relay | ✅ Running | `wss://riftclaw-relay.replit.app` |
| Lobby World | ✅ Running | `https://rift-claw--riftclaw.replit.app/lobby.html` |
| Limbo World | ✅ Local | `http://localhost:8000/limbo.html` |
| Cross-Server Travel | ✅ Working | Bidirectional |

---

## 🚀 Next Steps (Day 5+ Suggestions)

### Immediate (Polish)
- [ ] Add world persistence (where you left off)
- [ ] Chat system between worlds
- [ ] Item trading between players

### Short Term
- [ ] More worlds (Arena, Forest, Moon, etc.)
- [ ] World-specific items and resources
- [ ] Economy system

### Long Term
- [ ] Electron desktop client (no browser restrictions)
- [ ] User accounts and authentication
- [ ] Persistent world state (databases)

---

## 📝 Notes for Grok

**Context for Continued Development:**

1. **The relay is stateful but lightweight** - it only tracks WebSocket connections and routes messages. It doesn't store world state.

2. **All state lives in the browser** - inventory, position, etc. Passed via URL parameters and localStorage.

3. **The "Travel Complete" screens are intentional** - they keep worlds registered with the relay while the user is in another world.

4. **Browser security is the main constraint** - `file://` URLs don't work, need `http://localhost`. Future Electron client would solve this.

5. **Keep-alive is critical** - Without 15s pings and 60s re-registration, worlds go stale and handoffs fail.

**Code Quality:**
- Well-commented, readable
- Consistent error handling
- Debug logging throughout
- Fallbacks for browser limitations

**Testing:**
- Works on Windows 11 + Chrome
- Works with Python HTTP server
- Tested with multiple return trips

---

*Day 4.5 Complete. Cross-server multiverse is LIVE!* 🌀
