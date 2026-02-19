# RiftClaw Architecture v0.2.0

## Overview

RiftClaw now uses a **separated architecture**:
- **Relay**: WebSocket message router (stays running)
- **Worlds**: HTML files that connect to the relay (can be many instances)

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│  RiftClaw Relay (Replit)                │
│  wss://riftclaw-relay.replit.app        │
│  • Pure WebSocket, no HTTP              │
│  • Routes messages between worlds       │
│  • Runs 24/7                            │
└─────────────────────────────────────────┘
            ↑↓ WebSocket
    ┌───────┴───────┐
    │               │
┌───▼────┐     ┌────▼────┐
│ Lobby  │     │  Limbo  │
│ World  │     │  World  │
│(Replit)│     │(Local)  │
└────────┘     └─────────┘
```

## Deployment Guide

### 1. Deploy the Relay (Replit)

**Create a new Replit project:**
1. Create blank Node.js project named `riftclaw-relay`
2. Upload these files from `riftclaw/relay/`:
   - `server-v2.js` → rename to `server.js`
   - `package.json`
3. Click **Run**

**Verify:**
- Console shows: `WebSocket: wss://0.0.0.0:5000`
- No "lobby" connections appear automatically

### 2. Deploy Lobby World (Replit)

**Create a new Replit project:**
1. Create blank HTML project named `riftclaw-lobby`
2. Upload all files from `riftclaw/demos/threejs/`
3. In `.replit` file, set run command:
   ```bash
   python3 -m http.server 8080
   ```
4. **Important**: Update `lobby.html` relay URL if needed:
   ```javascript
   const RELAY_URL = 'wss://YOUR-RELAY.replit.app';
   ```
5. Click **Run**

### 3. Run Limbo Locally

**On your PC:**
```bash
# Download limbo files
curl -O https://raw.githubusercontent.com/RiftClawOrg/RiftClaw/main/riftclaw/demos/threejs/limbo.html
curl -O https://raw.githubusercontent.com/RiftClawOrg/RiftClaw/main/riftclaw/demos/threejs/start-limbo.bat

# Start server
start-limbo.bat
```

**Or manually:**
```bash
python3 -m http.server 8000
# Open http://localhost:8000/limbo.html
```

## Configuration

### Changing the Relay URL

In any world HTML file, find:
```javascript
// ============================================
// RELAY CONFIGURATION
// ============================================
const RELAY_URL = 'wss://riftclaw-relay.replit.app';
```

Change to your relay:
```javascript
const RELAY_URL = 'wss://your-relay.replit.app';
```

### Local Development

For testing everything locally:

**Terminal 1 - Relay:**
```bash
cd riftclaw/relay
npm install
node server.js
# Relay runs on ws://localhost:8765
```

**Terminal 2 - Limbo:**
```bash
cd riftclaw/demos/threejs
python3 -m http.server 8000
# Update limbo.html: const RELAY_URL = 'ws://localhost:8765';
# Open http://localhost:8000/limbo.html
```

**Terminal 3 - Lobby:**
```bash
cd riftclaw/demos/threejs
python3 -m http.server 8080
# Update lobby.html: const RELAY_URL = 'ws://localhost:8765';
# Open http://localhost:8080/lobby.html
```

## Public Relay

The official RiftClaw relay:
```
wss://riftclaw-relay.replit.app
```

Anyone can connect their worlds to this relay!

## Troubleshooting

### "No portals discovered"
- Check that worlds are using the same RELAY_URL
- Check Replit console for relay status
- Try manual reconnect button in UI

### "Connection refused"
- Relay might not be running
- Check RELAY_URL matches actual relay deployment

### Ghost connections
- Make sure you're NOT opening the relay URL in a browser
- Only open world HTML files

## Files Structure

```
riftclaw/
├── relay/
│   ├── server.js          # WebSocket relay (deploy to Replit)
│   └── package.json
├── worlds/                # Deploy these as static sites
│   ├── lobby.html         # Main lobby world
│   ├── limbo.html         # Local lobby template
│   ├── arena.html
│   ├── forest.html
│   ├── moon.html
│   ├── space-station.html
│   ├── water-world.html
│   └── cyb3r-world.html
└── README.md
```

## License

MIT - Open source, use freely!
