"""
RiftClaw - Cross-World Portal Traversal for AI Agents

A Python skill enabling AI agents to traverse between connected 3D worlds
through secure, cryptographically-signed portal handoffs.
"""

from .skill.riftclaw import (
    RiftClawSkill,
    AgentPassport,
    Portal,
    PortalState,
    RiftError,
    ConnectionError,
    SecurityError,
    HandoffError,
    quick_connect,
    portal_jump,
)

__version__ = "0.1.0"
__all__ = [
    "RiftClawSkill",
    "AgentPassport",
    "Portal",
    "PortalState",
    "RiftError",
    "ConnectionError",
    "SecurityError",
    "HandoffError",
    "quick_connect",
    "portal_jump",
]
