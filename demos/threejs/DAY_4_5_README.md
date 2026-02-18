# RiftClaw Day 4.5 - Cross-Server Three.js Worlds

🌌 **Cross-server portal traversal between local and hosted worlds!**

## Overview

Day 4.5 enables true cross-server portal crossings:
- **Local Limbo** (your machine) ↔ **Replit Worlds** (hosted)
- Inventory syncs between servers
- Press 'O' to return to previous world
- Dynamic portal discovery from relay

---

## 🚀 Quick Start

### 1. Start the Replit Relay

Your relay is already running at:
```
wss://rift-claw--riftclaw.replit.app
```

### 2. Open Local Limbo

```bash
# From your workspace
cd riftclaw/demos/threejs

# Open in browser (or use Python simple server)
python3 -m http.server 8080
# Then open http://localhost:8080/limbo.html

# OR just open the file directly
open limbo.html  # macOS
xdg-open limbo.html  # Linux
```

### 3. Visit Replit Lobby

Open in another tab:
```
https://rift-claw--riftclaw.replit.app/lobby.html
```

---

## 🎮 How It Works

### The Flow:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Local Limbo    │ ──WS──▶ │  Replit Relay    │ ◀──WS── │  Replit Lobby   │
│  (localhost)    │         │  (WebSocket)     │         │  (hosted)       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                           │                           │
         │ 1. Register               │ 2. Store world             │
         │    'limbo'                │    in worlds Map           │
         │                           │                           │
         │ 3. Discover ─────────────▶│                           │
         │                           │ 4. Return portals          │
         │                           │    including 'lobby'       │
         │                           │                           │
         │ 5. Walk into portal       │                           │
         │ 6. Send handoff_request ──▶│                          │
         │                           │ 7. Forward to target       │
         │                           │                           │
         │                           │ 8. Receive handoff_request │
         │                           │    with passport+inventory │
         │                           │                           │
         │                           │ 9. Send handoff_confirm ──▶│
         │                           │                           │
         │ 10. Receive confirm       │                           │
         │ 11. Open target URL       │                           │
         │     in new tab            │                           │
         ▼                           ▼                           ▼
```

### Inventory Sync:

```
Local Limbo                    Replit Lobby
     │                              │
     │ inventory.toJSON()           │
     ├─────────────────────────────▶│
     │                              │ localStorage.setItem(
     │                              │   'riftclaw_inventory',
     │                              │   passport.inventory
     │                              │ )
     │                              │
     │ Press 'O' to return          │
     │◀─────────────────────────────┤
     │                              │
     │ (Sends inventory back)       │
```

---

## 📁 New Files

### `/demos/threejs/limbo.html`
- **Local lobby world** - gray/neutral theme
- Connects to Replit relay
- Sends `register_world` on connect
- Spawns portals dynamically from discover response
- Sends inventory in handoff passport

### Updated Files:

#### `lobby.html` (and other worlds)
- Added `'O'` key handler for return portal
- Saves `riftclaw_source_world` and `riftclaw_source_url` on arrival
- Includes inventory in outgoing passports
- Parses incoming inventory from passport

#### `relay/server.js`
- Added `register_world` handler
- Worlds Map stores registered worlds
- `discover` returns registered + config worlds
- `handoff_request` forwards to registered worlds
- Cleanup removes worlds on disconnect

---

## 🎮 Controls

### Local Limbo:
| Key | Action |
|-----|--------|
| W,A,S,D | Move |
| SPACE | Jump |
| I | Inventory |
| Click+Drag | Rotate camera |
| Walk into portal | Cross to remote world |

### Replit Worlds:
| Key | Action |
|-----|--------|
| W,A,S,D | Move |
| SPACE | Jump |
| I | Inventory |
| **O** | **Return to previous world** |
| Click+Drag | Rotate camera |

---

## 🔄 Testing the Loop

### Test 1: Local → Remote

1. Open `limbo.html` locally
2. Wait for "Connected to relay"
3. See "Replit Lobby" portal appear
4. Walk into portal
5. New tab opens with Replit Lobby
6. **Inventory transfers!** ✅

### Test 2: Remote → Local (Return)

1. In Replit Lobby, press **'O'**
2. See "Returning to limbo..."
3. Get redirected back to local limbo
4. **Inventory comes back!** ✅

### Test 3: Full Loop

```
Local Limbo → Replit Lobby → Local Limbo
     │              │              │
     │ Inventory    │ Inventory    │ Inventory
     ├─────────────▶├─────────────▶├─────────────▶
     │              │              │
   x2 Shards    x3 Shards      x5 Shards
```

---

## 🐛 Troubleshooting

### "No portals discovered"
- Check relay is running
- Check browser console for WebSocket errors
- Verify `RELAY_URL` in limbo.html points to correct relay

### "Inventory not syncing"
- Check localStorage in browser DevTools
- Verify `passport.inventory` is in handoff messages
- Check for JSON parse errors

### "'O' key not working"
- Must walk through portal first (to set source)
- Check `localStorage.getItem('riftclaw_source_world')`
- Verify keydown event listener is attached

### "Relay not forwarding handoff"
- Check relay logs for registered worlds
- Verify target world is in `worlds` Map
- Check WebSocket readyState

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│  ┌──────────────┐                    ┌──────────────┐      │
│  │ Local Limbo  │◀──── WebSocket ───▶│ Replit Relay │      │
│  │  localhost   │                    │   hosted     │      │
│  └──────────────┘                    └──────────────┘      │
│         │                                    │              │
│         │ inventory JSON                     │              │
│         ├───────────────────────────────────▶│              │
│         │                                    │              │
│         │◀──────── handoff_confirm ──────────┤              │
│         │         (with target URL)          │              │
│  ┌──────┴──────┐                             │              │
│  │ Replit Tab  │◀────────────────────────────┘              │
│  │   (opened)  │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 What's Different from Day 4?

| Day 4 | Day 4.5 |
|-------|---------|
| Single-server worlds | Cross-server traversal |
| Manual URL params | WebSocket handoff protocol |
| No return mechanism | 'O' key return portal |
| Static portals | Dynamic discovery |
| Inventory in URL only | Inventory in WebSocket passport |

---

## 🚀 Next Steps (Day 5)

Now that cross-server Three.js works:
- Add **Minecraft** as another world option
- Same protocol, same inventory sync
- Browser ↔ Minecraft ↔ Browser

---

## 📝 Files Summary

**Created:**
- `riftclaw/demos/threejs/limbo.html` - Local lobby world

**Modified:**
- `riftclaw/demos/threejs/lobby.html` - Added 'O' key, incoming handoff
- `riftclaw/demos/threejs/arena.html` - Added 'O' key (if needed)
- `riftclaw/relay/server.js` - World registration, forwarding

---

**Day 4.5 Complete! 🌌🎮**

Local-to-remote portal crossing is now working!
