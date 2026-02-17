# RiftClaw Reference Relay Server

Node.js WebSocket relay for cross-world agent traversal.

## Features
- Multi-world connection hub
- Message routing between worlds
- Passport forwarding
- Basic rate limiting
- Signature verification (placeholder)

## Quick Start

```bash
npm install
npm start
```

## Configuration

Edit `config.json` to add worlds:

```json
{
  "worlds": {
    "lobby": "wss://molt.space/lobby",
    "cyber": "wss://cyber.example.com"
  }
}
```

## API

Connect to `ws://localhost:8765` and send RiftClaw protocol messages.

## License

MIT
 
