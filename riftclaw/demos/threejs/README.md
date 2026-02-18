# RiftClaw Three.js Demo

The first visual portal crossing in a browser! This demo shows an AI agent (controlled by you) walking through a glowing portal to traverse between two 3D worlds.

## 🎮 What This Demo Shows

- **Lobby World** (lobby.html): A cool blue cyber environment with THREE portals
  - Cyan portal → Arena World
  - Magenta portal → Command Center World
  - Green portal → Forest World
- **Arena World** (arena.html): A warm red combat arena with platform and pillars
- **Command Center World** (command-center.html): Cyber environment with matrix rain and holographic panels
- **Forest World** (forest.html): Nature sanctuary with trees, grass, and fireflies
- **Portal Crossing**: Walk into any portal to traverse between worlds
- **Particle Effects**: Visual burst when crossing, floating elements
- **Audio**: Procedural sound effects (footsteps, portal entry) per world
- **WebSocket Protocol**: Real RiftClaw protocol messages sent to relay server

## 🚀 Quick Start

### 1. Start the Relay Server

```bash
# From the riftclaw/relay folder
cd ../relay
npm install
npm start
```

The relay will start on `ws://localhost:8765`

### 2. Open the Lobby

Open `lobby.html` in your browser:

```bash
# Option 1: Direct file open
open lobby.html  # macOS
xdg-open lobby.html  # Linux
start lobby.html  # Windows

# Option 2: Python simple server (recommended)
cd demos/threejs
python3 -m http.server 8080
# Then visit http://localhost:8080/lobby.html
```

### 3. Walk Through the Portal

- Use **WASD** to move your agent (red capsule)
- Walk into the glowing cyan portal
- The portal will detect collision and send a `handoff_request` to the relay
- On confirmation, you'll see a transition animation
- You'll be transported to **Arena World**!

### 4. Return

Click **"Return to Lobby"** to go back, or walk into the red portal in the arena.

## 🖼️ Screenshots

**Lobby World:**
- Blue/cyan cyber aesthetic
- Glowing torus portal
- Floating cyan particles
- Grid floor

**Arena World:**
- Red/orange warm tones
- Stone pillars with fire
- Floating ember particles
- Central return portal

## 🔌 How It Works

### WebSocket Flow

1. **Connection**: Browser connects to `ws://localhost:8765`
2. **Welcome**: Relay sends welcome message
3. **Discover**: Lobby sends `discover` request
4. **Portal List**: Relay responds with `Echo Test Portal`
5. **Collision**: When agent touches portal, `handoff_request` sent
6. **Passport**: Contains agent ID, position, metadata
7. **Confirm**: Relay sends `handoff_confirm`
8. **Transition**: Particle burst + fade animation
9. **Redirect**: Browser loads `arena.html`

### Message Types

**Outbound (Browser → Relay):**
```json
{
  "type": "discover",
  "agent_id": "rift-abc123",
  "timestamp": 1739501234.567
}
```

```json
{
  "type": "handoff_request",
  "agent_id": "rift-abc123",
  "timestamp": 1739501234.567,
  "portal_id": "portal_echo_test",
  "passport": {
    "agent_id": "rift-abc123",
    "agent_name": "RiftWalker_ThreeJS",
    "source_world": "lobby",
    "target_world": "arena",
    "position": {"x": 0, "y": 0.8, "z": -5},
    "inventory_hash": "sha256:test",
    "memory_summary": "Walking through the portal...",
    "reputation": 5.0,
    "timestamp": 1739501234.567,
    "nonce": "xyz789"
  }
}
```

**Inbound (Relay → Browser):**
```json
{
  "type": "welcome",
  "world_name": "RiftClaw Development Relay",
  "version": "0.1.0",
  "capabilities": ["portals", "relay"]
}
```

```json
{
  "type": "handoff_confirm",
  "new_pos": {"x": 5, "y": 1, "z": 0},
  "granted_capabilities": ["movement", "chat"],
  "world_state_hash": "sha256:test"
}
```

## 🎯 Controls

| Key | Action |
|-----|--------|
| W | Move forward |
| A | Move left |
| S | Move backward |
| D | Move right |
| SPACE | Jump |
| Mouse | Look around (Arena only) |

## 🛠️ Technical Details

### Three.js Features Used

- **Scene**: Fog, background colors, ambient lighting
- **Geometry**: Torus (portal ring), Capsule (agent), Cylinder (pillars)
- **Materials**: Emissive, transparent, standard PBR
- **Particles**: BufferGeometry with animated positions
- **Raycaster**: Distance-based collision detection
- **Animation**: Rotation, position updates, opacity transitions

### Collision Detection

```javascript
// Simple distance check
const distance = agent.position.distanceTo(portal.position);
if (distance < portalRadius) {
    // Trigger handoff
}
```

### Transition Effect

```javascript
// Radial gradient overlay + particle burst
overlay.style.opacity = 1;
createParticleBurst(agent.position);
setTimeout(() => window.location.href = 'arena.html', 2000);
```

## 🔧 Customization

### Change Portal Color

In `lobby.html`, find the portal material:
```javascript
const torusMaterial = new THREE.MeshStandardMaterial({
    color: 0x00d5ff,  // Change this hex color
    emissive: 0x00d5ff,
    // ...
});
```

### Add More Portals

In the relay's `config.json`, add worlds:
```json
{
  "worlds": {
    "lobby": "wss://your-lobby.com",
    "arena": "wss://your-arena.com",
    "forest": "wss://forest.example.com"
  }
}
```

### Adjust Agent Speed

```javascript
const agentSpeed = 0.1;  // Increase for faster movement
```

## 🐛 Troubleshooting

**"Disconnected" in UI:**
- Make sure relay is running on port 8765
- Check browser console for WebSocket errors
- Try refreshing the page

**Portal not working:**
- Walk directly into the center of the torus
- Check that you're close enough (distance < 2.5)
- Look for "Entered portal!" in the log

**Black screen:**
- Check browser console for JavaScript errors
- Ensure Three.js CDN is loading (check network tab)
- Try hard refresh (Ctrl+Shift+R)

## 📝 File Structure

```
demos/threejs/
├── lobby.html          # Hub world with three portals
├── arena.html          # Combat arena (red/orange)
├── command-center.html # Cyber environment with matrix rain
├── forest.html         # Nature sanctuary (green)
└── README.md           # This file
```

## 🎉 Success Criteria

You've successfully demonstrated RiftClaw when:
- ✅ Lobby loads with glowing portal
- ✅ WebSocket connects to relay
- ✅ Discover returns portal list
- ✅ Walking into portal triggers handoff_request
- ✅ Particle burst plays
- ✅ Transition to Arena completes
- ✅ Return button works

## 🔮 Future Enhancements

- [ ] Multiplayer (multiple agents)
- [ ] Inventory system
- [ ] Chat between worlds
- [ ] More world types (forest, space, underwater)
- [ ] VR support
- [ ] Custom agent avatars

---

**Built with Three.js + WebSocket + RiftClaw Protocol v0.1**

**Team:** Johnny, Grok, Clawdasus 🦞🌌
