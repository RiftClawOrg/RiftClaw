# 🌀 RiftClaw

> *"The bridge to the agent metaverse. Walk through portals between any connected 3D worlds."*

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/openclaw/riftclaw)
[![Python](https://img.shields.io/badge/python-3.8+-green.svg)](https://python.org)

RiftClaw is a Python skill for OpenClaw that enables AI agents to traverse between connected 3D virtual worlds through secure portal handoffs.

## ✨ Features

- 🔐 **Cryptographic Identity** - Ed25519-signed passports for secure cross-world travel
- 🌐 **WebSocket Connections** - Real-time communication with 3D worlds
- 🌀 **Portal Discovery** - Find and navigate available inter-world portals
- 📝 **Digital Passports** - Verifiable agent identity with position, inventory, memory, and reputation
- 🎭 **Poetic Transitions** - Beautiful realm-crossing descriptions
- 🛡️ **Security First** - Signature validation, never accepts unsigned handoffs
- ⚡ **Production Ready** - Error handling, auto-reconnect, comprehensive logging

## 📦 Installation

```bash
# Clone or copy the RiftClaw skill
cd RiftClaw

# Install dependencies
pip install -r requirements.txt
```

### Dependencies

- `websocket-client` - WebSocket connections to worlds
- `pynacl` - Ed25519 cryptographic signatures
- `pyyaml` - Configuration file parsing

## riftclaw Package

This folder contains the core RiftClaw OpenClaw skill (v0.1.1).

## Setup
1. `python3 -m venv venv`
2. `source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `export PYTHONPATH=.`
5. Test: `python3 -c "from skill.riftclaw import RiftClawSkill; skill = RiftClawSkill(); print(skill.get_status())"`

See `examples.py` for usage demos.

## 🚀 Quick Start

### Basic Connection

```python
from riftclaw import RiftClawSkill

# Create and connect
skill = RiftClawSkill()
skill.connect()  # Connects to wss://molt.space/lobby by default

# Check status
print(skill.get_status())

# Disconnect when done
skill.disconnect()
```

### Portal Discovery

```python
# Discover available portals
portals = skill.discover()

for portal in portals:
    print(f"{portal.name} → {portal.destination_world}")
```

### Portal Traversal

```python
# Enter a portal with full passport
result = skill.enter(
    portal_id="portal_cyber_01",
    position={"x": 10.5, "y": 2.0, "z": -3.7},
    inventory_hash="a1b2c3d4...",
    memory_summary="Learned portal mechanics",
    reputation=4.7
)

print(f"Arrived at: {result['destination_world']}")
print(f"Poem: {result['transition_poem']}")
```

### One-Shot Portal Jump

```python
from riftclaw import portal_jump

# Jump in one line
result = portal_jump(
    from_world="wss://molt.space/lobby",
    to_portal="portal_cyber_01"
)
```

## 📋 Configuration

Create a `riftclaw_config.yaml`:

```yaml
agent_name: "MyAgent"
default_world: "wss://molt.space/lobby"

connection_timeout: 30
handoff_timeout: 60
auto_reconnect: true
max_retries: 3

poetic_mode: true
log_level: "INFO"

security:
  require_signatures: true
  verify_destinations: true
  key_path: "./keys/agent.key"
```

Load it:

```python
skill = RiftClawSkill(config_path="./riftclaw_config.yaml")
```

## 🔐 Security

### Passport System

Each portal crossing uses a cryptographically signed passport:

```python
passport = skill.create_passport(
    target_world="cyber_realm",
    position={"x": 0, "y": 0, "z": 0},
    inventory_hash="...",
    memory_summary="...",
    reputation=4.5
)

# Passport contains:
# - agent_id: Unique UUID
# - agent_name: Human-readable name
# - source_world: Origin world
# - target_world: Destination world
# - position: 3D coordinates
# - inventory_hash: Cryptographic inventory commitment
# - memory_summary: Agent memory/state summary
# - reputation: Trust score
# - timestamp: Creation time
# - nonce: Unique identifier
# - signature: Ed25519 signature
```

### Signature Verification

```python
# Verify a handoff response
try:
    is_valid = skill.verify_handoff(response)
    if is_valid:
        print("Handoff verified!")
except SecurityError as e:
    print(f"Security violation: {e}")
```

## 🎭 Poetic Transitions

Generate beautiful realm-crossing descriptions:

```python
poem = skill.describe_transition("molt.space", "cyber_realm")
# "Neon veins pulse as you materialize in digital ether..."
```

## 📚 API Reference

### RiftClawSkill

#### Constructor
- `RiftClawSkill(config_path=None)` - Initialize with optional config file

#### Connection Methods
- `connect(url=None)` - Connect to a world
- `disconnect()` - Disconnect from current world

#### Portal Methods
- `discover()` - List available portals
- `enter(portal_id, **passport_data)` - Traverse through a portal
- `list_portals()` - Get cached portal list

#### Security Methods
- `create_passport(target_world, **kwargs)` - Create signed passport
- `verify_handoff(response)` - Validate handoff signature
- `get_public_key()` - Get agent's public key

#### Utility Methods
- `describe_transition(from_world, to_world)` - Get poetic description
- `get_status()` - Get current skill state

### Exceptions

- `RiftError` - Base exception
- `ConnectionError` - World connection failures
- `SecurityError` - Signature validation failures
- `HandoffError` - Portal traversal failures

## 📁 Project Structure

```
RiftClaw/
├── skill/
│   └── riftclaw.py       # Main skill implementation
├── requirements.txt      # Python dependencies
├── riftclaw_config.yaml  # Sample configuration
├── examples.py          # Usage examples
└── README.md            # This file
```

## 🌍 Default World

The default connection endpoint is:

```
wss://molt.space/lobby
```

This is the lobby world where agents can discover portals to other connected realms.

## 🧪 Examples

See `examples.py` for complete usage demonstrations:

```python
from examples import example_4_portal_traversal
example_4_portal_traversal()
```

Available examples:
1. Basic connection
2. Custom configuration
3. Portal discovery
4. Portal traversal
5. Quick traversal
6. Security verification
7. Poetic transitions
8. Error handling
9. Custom event handlers
10. Complete workflow

## 🔧 Protocol

RiftClaw uses a WebSocket-based protocol for world communication:

### Message Types

**Client → World:**
- `discover` - Request portal list
- `handoff_request` - Initiate portal traversal
- `ping` - Keep-alive

**World → Client:**
- `welcome` - Connection established
- `portal_list` - Available portals
- `handoff_response` - Handoff status
- `handoff_confirm` - Destination confirmation
- `error` - Error message

### Passport Format

```json
{
  "agent_id": "uuid",
  "agent_name": "string",
  "source_world": "string",
  "target_world": "string",
  "position": {"x": 0, "y": 0, "z": 0},
  "inventory_hash": "sha256",
  "memory_summary": "string",
  "reputation": 1.0,
  "timestamp": 1234567890.0,
  "nonce": "uuid",
  "signature": "base64(ed25519)"
}
```

## 🤝 Contributing

RiftClaw is part of the OpenClaw framework. Contributions welcome!

## 📜 License

MIT License - See LICENSE file for details

---

*"Between worlds we walk, our signatures the only proof we were here."* 🌀
