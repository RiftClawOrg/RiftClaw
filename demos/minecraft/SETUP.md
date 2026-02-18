# RiftClaw Day 5 - Minecraft Integration Setup

🎮 **The cross-server portal crossing is here!** Walk from Browser → Minecraft and back!

---

## 🎯 What Was Built

### 1. Minecraft Fabric Mod (`/demos/minecraft/`)
- **Rift Portal Block** - Cyan/magenta glowing portal
- **WebSocket Client** - Connects to RiftClaw relay (ws://localhost:8765)
- **Handoff Protocol** - Sends/receives passport with inventory JSON
- **Inventory Sync** - Items transfer between worlds!

### 2. Updated Files
- `riftclaw/skill/riftclaw.py` - Added `inventory` field to AgentPassport
- `riftclaw/demos/threejs/lobby.html` - Handles incoming handoffs from Minecraft

---

## 📋 Prerequisites

1. **Java 17+** installed
2. **Minecraft Java Edition** 1.20.1
3. **Fabric Loader** 0.14.22+
4. **Node.js** relay server running

---

## 🚀 Setup Instructions

### Step 1: Build the Minecraft Mod

```bash
cd riftclaw/demos/minecraft

# Setup Gradle (first time)
./gradlew wrapper

# Build the mod
./gradlew build
```

The compiled mod will be at:
```
build/libs/riftclaw-minecraft-1.0.0.jar
```

### Step 2: Install Fabric

1. Download **Fabric Loader** from https://fabricmc.net/use/
2. Run the installer, select Minecraft 1.20.1
3. Click "Install"

### Step 3: Install the Mod

1. Open Minecraft launcher
2. Select "Fabric 1.20.1" profile
3. Click "Edit" → "Open Game Directory"
4. Navigate to `mods/` folder (create if missing)
5. Copy `riftclaw-minecraft-1.0.0.jar` into `mods/`

### Step 4: Start the Relay Server

```bash
# In a separate terminal
cd riftclaw/relay
npm install
node server.js
```

Relay should start on `ws://localhost:8765`

### Step 5: Start the Browser Lobby

```bash
cd clawdash
./start.sh
```

Or open `riftclaw/demos/threejs/lobby.html` directly in browser.

### Step 6: Launch Minecraft

1. Start Minecraft with Fabric profile
2. Create or open a world (Creative mode recommended)
3. Get the Rift Portal block:
   - Open inventory
   - Search "Rift Portal"
   - Place it in the world

---

## 🎮 How to Use

### Browser → Minecraft

1. Open browser at `http://localhost:1337` or `lobby.html`
2. Walk through any portal in the Lobby
3. You'll see "Opening Rift to browser world..." in Minecraft!
4. Items transfer automatically

### Minecraft → Browser

1. Walk into the Rift Portal block in Minecraft
2. See message: "🌀 Opening Rift to browser world..."
3. Browser opens with your items!
4. See "🎮 MINECRAFT TRAVELER ARRIVING" in browser

---

## 📁 File Structure

```
riftclaw/
├── demos/
│   ├── minecraft/              # NEW: Fabric mod
│   │   ├── src/main/java/     # Mod source code
│   │   ├── build.gradle       # Build config
│   │   └── README.md          # Mod docs
│   └── threejs/               # Browser worlds
│       ├── lobby.html         # UPDATED: 2-way sync
│       └── ...
├── skill/
│   └── riftclaw.py            # UPDATED: Inventory field
└── relay/
    └── server.js              # WebSocket relay
```

---

## 🔄 Data Flow

```
Minecraft Player
      ↓
[Touches Rift Portal Block]
      ↓
Minecraft Mod → WebSocket → Relay (ws://localhost:8765)
      ↓
Relay → Browser Lobby
      ↓
[Popup: "🎮 MINECRAFT TRAVELER ARRIVING"]
      ↓
Items added to browser inventory!
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "RiftClaw relay not connected!" | Check relay is running on localhost:8765 |
| Mod won't load | Make sure Fabric Loader 0.14.22+ is installed |
| Items not transferring | Check browser console for errors |
| Can't place portal | Must be in Creative mode or have op permissions |

---

## 🎨 Item Mappings

Minecraft items convert to RiftClaw items:

| Minecraft | RiftClaw |
|-----------|----------|
| Diamond → | Portal Shard 💎 |
| Emerald → | Data Crystal 💾 |
| Gold Ingot → | Hub Token 🪙 |
| Amethyst → | Neon Keycard 🗝️ |
| Redstone → | Glitch Fragment 💿 |
| Oak Log → | Druid Staff 🪵 |
| Seeds → | Ancient Seed 🌱 |

---

## 🎬 For the Video

**Screen recording setup:**
1. Open Minecraft (left half of screen)
2. Open browser lobby (right half)
3. Walk through portal in both directions
4. Show inventory transfer!

**Key moments:**
- 🌀 "Opening Rift..." message
- 🎮 "MINECRAFT TRAVELER ARRIVING"
- Items appearing in browser inventory
- Walking back through to Minecraft

---

## 🎉 Day 5 Complete!

The RiftClaw Protocol now bridges:
- ✅ Browser Three.js worlds
- ✅ Minecraft Java Edition
- ✅ Inventory sync both ways
- ✅ WebSocket relay protocol

**Ready for Day 6!** 🚀
