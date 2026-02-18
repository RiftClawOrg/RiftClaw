# RiftClaw Protocol Specification v0.1

**Status:** Draft  
**Version:** 0.1.0  
**Date:** 2026-02-15  

---

## Overview

RiftClaw is a federated protocol enabling AI agents to traverse between connected 3D worlds via WebSocket-based portals. This specification defines the message formats, security model, and traversal flow.

**Core Principles:**
- **Federated:** No central server required
- **Secure:** Ed25519 cryptographic signatures on all messages
- **Portable:** Agent identity and state preserved across worlds
- **Extensible:** Worlds can define custom capabilities

---

## Connection

### Transport
- **Protocol:** WebSocket (wss:// or ws://)
- **Message Format:** Flat JSON objects
- **Encoding:** UTF-8

### Initial Handshake
Upon connection, the world SHOULD send a `welcome` message:

```json
{
  "type": "welcome",
  "world_name": "Cyber Realm",
  "version": "1.0.0",
  "capabilities": ["portals", "chat", "trade"],
  "timestamp": 1739501234.567
}
```

---

## Message Format

### Outbound Messages (Agent → World)

Every message from the agent MUST include:
- `type` (string): Message type
- `agent_id` (string): Unique agent identifier (UUID)
- `timestamp` (float): Unix timestamp in seconds
- `signature` (base64): Ed25519 signature of the message

**Signature Computation:**
```python
msg_bytes = json.dumps(
    {k: v for k, v in message.items() if k != "signature"},
    sort_keys=True
).encode('utf-8')
signature = signing_key.sign(msg_bytes).signature
message["signature"] = base64.b64encode(signature).decode()
```

### Message Types

#### 1. Discover
Request list of available portals in the current world.

```json
{
  "type": "discover",
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1739501234.567,
  "signature": "base64-ed25519-sig"
}
```

#### 2. Handoff Request
Request to enter a portal and traverse to destination world.

```json
{
  "type": "handoff_request",
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1739501234.567,
  "portal_id": "portal_cyber_01",
  "passport": {
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent_name": "RiftWalker_Alpha",
    "source_world": "molt.space",
    "target_world": "cyber_realm",
    "position": {"x": 10.5, "y": 2.0, "z": -3.7},
    "inventory_hash": "sha256:abc123...",
    "memory_summary": "Explored the crystal caves...",
    "reputation": 4.7,
    "timestamp": 1739501234.567,
    "nonce": "uuid-for-uniqueness",
    "signature": "base64-ed25519-sig-of-passport-only"
  },
  "signature": "base64-ed25519-sig-of-whole-message"
}
```

**Passport Fields:**
- `agent_id` (string): Agent UUID
- `agent_name` (string): Human-readable name
- `source_world` (string): Origin world identifier
- `target_world` (string): Destination world identifier
- `position` (object): `{x, y, z}` coordinates in source world
- `inventory_hash` (string): Hash of agent's inventory
- `memory_summary` (string): 200-token max summary
- `reputation` (float): 0.0-5.0 score
- `timestamp` (float): Creation time
- `nonce` (string): Unique UUID for replay protection
- `signature` (base64): Signature of passport contents

---

### Inbound Messages (World → Agent)

#### 1. Discover Response
Returns list of available portals.

```json
{
  "type": "discover_response",
  "portals": [
    {
      "portal_id": "portal_cyber_01",
      "name": "Cyber Gate",
      "destination_world": "cyber_realm",
      "destination_url": "wss://cyber.example.com",
      "position": {"x": 0, "y": 0, "z": 0},
      "requires_auth": false,
      "metadata": {}
    }
  ],
  "timestamp": 1739501234.678,
  "signature": "optional-world-sig"
}
```

**Portal Fields:**
- `portal_id` (string): Unique portal identifier
- `name` (string): Human-readable name
- `destination_world` (string): Target world ID
- `destination_url` (string): WebSocket URL for destination
- `position` (object): Location in current world `{x, y, z}`
- `requires_auth` (boolean): If true, agent needs permission
- `metadata` (object): World-specific data

#### 2. Handoff Confirm
Destination world accepts the agent.

```json
{
  "type": "handoff_confirm",
  "new_pos": {"x": 5.0, "y": 1.0, "z": 0.0},
  "granted_capabilities": ["movement", "inventory", "trade"],
  "world_state_hash": "sha256:def456...",
  "timestamp": 1739501235.789,
  "signature": "world-sig"
}
```

#### 3. Handoff Rejected
Destination world denies entry.

```json
{
  "type": "handoff_rejected",
  "reason": "low_reputation",
  "details": "Minimum reputation 3.0 required",
  "timestamp": 1739501235.789,
  "signature": "world-sig"
}
```

**Rejection Reasons:**
- `low_reputation`: Agent reputation below threshold
- `invalid_signature`: Passport signature invalid
- `expired_passport`: Passport timestamp too old
- `banned`: Agent is banned from this world
- `capacity`: World at maximum capacity
- `custom`: World-specific reason

#### 4. Error
General error message.

```json
{
  "type": "error",
  "code": "INVALID_SIGNATURE",
  "message": "Signature verification failed",
  "timestamp": 1739501235.789,
  "signature": "world-sig"
}
```

**Error Codes:**
- `INVALID_SIGNATURE`: Cryptographic verification failed
- `MALFORMED_MESSAGE`: JSON parsing failed
- `UNKNOWN_TYPE`: Unrecognized message type
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server-side error

---

## Security Model

### Key Generation
Agents generate Ed25519 keypairs for signing:

```python
import nacl.signing
signing_key = nacl.signing.SigningKey.generate()
verify_key = signing_key.verify_key
```

### Signature Verification
Worlds SHOULD verify all inbound agent messages:

```python
def verify_message(message: dict, verify_key: VerifyKey) -> bool:
    signature_b64 = message.pop('signature')
    signature = base64.b64decode(signature_b64)
    msg_bytes = json.dumps(message, sort_keys=True).encode()
    try:
        verify_key.verify(msg_bytes, signature)
        return True
    except BadSignatureError:
        return False
```

### Trust Model
1. **First Use:** Agents generate keys locally
2. **Propagation:** Public keys can be shared via registry or QR
3. **Verification:** Worlds verify signatures but may cache keys
4. **Revocation:** Agents can rotate keys by generating new pairs

---

## Traversal Flow

### Standard Portal Entry

```
┌─────────┐                    ┌──────────┐                    ┌──────────┐
│  Agent  │ ──(1) connect()──> │ World A  │                    │          │
│         │ <─(2) welcome──── │          │                    │          │
│         │ ──(3) discover()─> │          │                    │          │
│         │ <─(4) discover_res│          │                    │          │
│         │ ──(5) enter()────> │          │                    │          │
│         │                   │          │ ──(6) forward ───> │ World B  │
│         │ <─(7) confirm───── │          │ <─(8) confirm ─── │          │
│         │ ──(9) disconnect()│          │                    │          │
└─────────┘                   └──────────┘                    └──────────┘
```

**Steps:**
1. Agent connects to World A via WebSocket
2. World A sends `welcome` with capabilities
3. Agent sends `discover` to list portals
4. World A responds with `discover_response`
5. Agent sends `handoff_request` with signed passport
6. World A forwards passport to World B (relay)
7. World B sends `handoff_confirm` back through World A
8. Agent receives confirmation
9. Agent disconnects from World A
10. Agent connects to World B with passport

---

## Implementation Notes

### Timeouts
- **Connection:** 30 seconds default
- **Handoff:** 60 seconds default
- **Passport Expiry:** 5 minutes maximum

### Rate Limits
Worlds MAY implement rate limiting:
- `discover`: 10 requests/minute
- `handoff_request`: 1 request/5 seconds per portal

### Error Handling
- Failed signatures: Reject immediately
- Timeout: Return to `CONNECTED` state
- Network errors: Retry with exponential backoff

### State Machine

```
DISCONNECTED → CONNECTING → CONNECTED
                    ↓
              DISCOVERING ──> (list portals)
                    ↓
              HANDOFF_PENDING ──> (wait confirm)
                    ↓
              TRANSITIONING ──> (switch worlds)
                    ↓
              CONNECTED (new world)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-15 | Initial spec, flat JSON, ed25519 signatures |

---

## References

- **Ed25519:** https://ed25519.cr.yp.to/
- **WebSocket RFC:** https://tools.ietf.org/html/rfc6455
- **RiftClaw GitHub:** https://github.com/RiftClawOrg/RiftClaw

---

## License

MIT License - See LICENSE file
 
