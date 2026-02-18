# RiftClaw Minecraft Mod

A Fabric mod that enables cross-server portal crossings between Minecraft and the RiftClaw browser-based worlds.

## Features

- 🌀 **Rift Portal Block** - Cyan/magenta glowing portal that connects to RiftClaw relay
- 🎒 **Inventory Sync** - Items transfer between browser and Minecraft
- 🌐 **WebSocket Integration** - Real-time handoff protocol with RiftClaw relay
- 🔄 **Two-way Crossing** - Browser ↔ Minecraft seamless teleportation

## Requirements

- Minecraft 1.20.1
- Fabric Loader 0.14.22+
- Fabric API

## Installation

1. Download the mod `.jar` from releases
2. Place in your Minecraft `mods` folder
3. Start Minecraft with Fabric
4. Join a world and place a Rift Portal block!

## Development Setup

```bash
# Clone the repository
cd riftclaw/demos/minecraft

# Setup Gradle wrapper
./gradlew wrapper

# Build the mod
./gradlew build

# Run client with mod
./gradlew runClient
```

## Configuration

Edit `config/riftclaw.json`:
```json
{
  "relayUrl": "ws://localhost:8765",
  "worldName": "minecraft-overworld",
  "portalSpawnX": 0,
  "portalSpawnY": 64,
  "portalSpawnZ": 0
}
```

## How It Works

1. Player touches Rift Portal block in Minecraft
2. Mod sends `handoff_request` to RiftClaw relay via WebSocket
3. Relay forwards to browser Lobby
4. Browser receives passport with inventory JSON
5. Player spawns in browser world with items!
6. Reverse process for Browser → Minecraft

## License

MIT - Part of the RiftClaw Protocol
