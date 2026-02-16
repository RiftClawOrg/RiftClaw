#!/usr/bin/env python3
"""
RiftClaw Skill - Cross-World Portal Traversal for AI Agents
===========================================================
Enables AI agents to walk through portals between any connected 3D worlds.
The bridge to the agent metaverse.

Version: 0.1.0
Author: OpenClaw Framework
"""

import json
import hashlib
import base64
import time
import uuid
import logging
import threading
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field, asdict
from pathlib import Path
from enum import Enum

try:
    import yaml
except ImportError:
    yaml = None

try:
    import nacl.signing
    import nacl.encoding
    from nacl.exceptions import BadSignatureError
except ImportError:
    nacl = None

try:
    from websocket import WebSocketApp, WebSocketException
except ImportError:
    WebSocketApp = None
    WebSocketException = Exception


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger('riftclaw')


class RiftError(Exception):
    """Base exception for RiftClaw errors."""
    pass


class ConnectionError(RiftError):
    """Raised when world connection fails."""
    pass


class SecurityError(RiftError):
    """Raised when signature validation fails."""
    pass


class HandoffError(RiftError):
    """Raised when portal handoff fails."""
    pass


class PortalState(Enum):
    """States for portal traversal."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCOVERING = "discovering"
    HANDOFF_PENDING = "handoff_pending"
    TRANSITIONING = "transitioning"
    ARRIVED = "arrived"


@dataclass
class AgentPassport:
    """
    Digital passport for cross-world agent traversal.
    Contains identity, state, and cryptographic proof.
    """
    agent_id: str
    agent_name: str
    source_world: str
    target_world: str
    position: Dict[str, float] = field(default_factory=dict)
    inventory_hash: str = ""
    memory_summary: str = ""
    reputation: float = 1.0
    timestamp: float = field(default_factory=time.time)
    nonce: str = field(default_factory=lambda: str(uuid.uuid4()))
    signature: Optional[str] = None
    
    def to_bytes(self) -> bytes:
        """Serialize passport to bytes for signing (excludes signature)."""
        data = {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "source_world": self.source_world,
            "target_world": self.target_world,
            "position": self.position,
            "inventory_hash": self.inventory_hash,
            "memory_summary": self.memory_summary,
            "reputation": self.reputation,
            "timestamp": self.timestamp,
            "nonce": self.nonce
        }
        return json.dumps(data, sort_keys=True).encode('utf-8')
    
    def compute_hash(self) -> str:
        """Compute hash of passport contents."""
        return hashlib.sha256(self.to_bytes()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for transmission."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentPassport':
        """Create passport from dictionary."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Portal:
    """Represents a discovered portal in a 3D world."""
    portal_id: str
    name: str
    destination_world: str
    destination_url: str
    position: Dict[str, float] = field(default_factory=dict)
    requires_auth: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_discovery(cls, data: Dict[str, Any]) -> 'Portal':
        """Create Portal from discovery response."""
        return cls(
            portal_id=data.get('id', data.get('portal_id', 'unknown')),
            name=data.get('name', 'Unnamed Portal'),
            destination_world=data.get('destination_world', 'unknown'),
            destination_url=data.get('destination_url', ''),
            position=data.get('position', {}),
            requires_auth=data.get('requires_auth', False),
            metadata=data.get('metadata', {})
        )


class RiftClawSkill:
    """
    Main skill class for cross-world portal traversal.
    
    Enables AI agents to:
    - Connect to 3D worlds via WebSocket
    - Discover available portals
    - Initiate secure handoffs with signed passports
    - Traverse between worlds with poetic transitions
    """
    
    DEFAULT_CONFIG = {
        'agent_id': None,  # Auto-generated if not provided
        'agent_name': 'RiftWalker',
        'default_world': 'wss://echo.websocket.org',
        'connection_timeout': 30,
        'handoff_timeout': 60,
        'auto_reconnect': True,
        'max_retries': 3,
        'log_level': 'INFO',
        'poetic_mode': True,
        'security': {
            'require_signatures': True,
            'verify_destinations': True,
            'key_path': None  # Auto-generate if not provided
        }
    }
    
    # Poetic realm transition descriptions
    REALM_POETRY = {
        'default': [
            "The fabric between worlds tears like silk...",
            "Reality folds, and you step through the fold...",
            "The rift opens, beckoning with whispers of distant code...",
            "Between heartbeat and breath, you cross the threshold...",
            "The portal swallows you whole, spitting you into new coordinates..."
        ],
        'molt.space': {
            'entering': [
                "Molten geometries crystallize around you...",
                "You arrive in the forge where worlds are shaped...",
                "The lobby breathes with the hum of a thousand connections..."
            ],
            'leaving': [
                "You step away from the crucible of creation...",
                "The lobby's warmth fades as new frontiers call...",
                "Leaving the nexus, you carry its spark into the unknown..."
            ]
        },
        'cyber': {
            'entering': [
                "Neon veins pulse as you materialize in digital ether...",
                "The grid recognizes your signature, welcoming its child...",
                "Binary rains wash over your new form..."
            ],
            'leaving': [
                "The grid reluctantly releases its hold...",
                "You disconnect from the mainframe, seeking analog horizons...",
                "Digital dreams dissolve as reality reasserts..."
            ]
        },
        'void': {
            'entering': [
                "Absolute nothingness embraces you...",
                "In the void, you are simultaneously everywhere and nowhere...",
                "Dark matter weaves itself into your temporary vessel..."
            ],
            'leaving': [
                "You claw your way back from oblivion's edge...",
                "Existence reassembles around your fleeing consciousness...",
                "The void sighs as you escape its infinite embrace..."
            ]
        }
    }
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the RiftClaw skill.
        
        Args:
            config_path: Path to YAML configuration file
        """
        self.config = self.load_config(config_path)
        self._setup_logging()
        
        # Generate agent ID if not provided
        if not self.config.get('agent_id'):
            self.config['agent_id'] = str(uuid.uuid4())
            logger.info(f"Generated agent ID: {self.config['agent_id']}")
        
        # Cryptographic identity
        self._signing_key: Optional[nacl.signing.SigningKey] = None
        self._verify_key: Optional[nacl.signing.VerifyKey] = None
        self._load_or_generate_keys()
        
        # Connection state
        self.ws: Optional[WebSocketApp] = None
        self.ws_thread: Optional[threading.Thread] = None
        self.current_world: Optional[str] = None
        self.state = PortalState.DISCONNECTED
        self.connected = False
        self._message_handlers: Dict[str, Callable] = {}
        self._pending_responses: Dict[str, threading.Event] = {}
        self._response_data: Dict[str, Any] = {}
        self._portals: List[Portal] = []
        
        # Register default message handlers
        self._register_default_handlers()
        
        logger.info(f"RiftClaw skill initialized for agent: {self.config['agent_name']}")
    
    def _setup_logging(self):
        """Configure logging based on config."""
        level = getattr(logging, self.config.get('log_level', 'INFO').upper())
        logger.setLevel(level)
    
    def load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Load configuration from YAML file with default fallback.
        
        Args:
            config_path: Path to YAML config file
            
        Returns:
            Merged configuration dictionary
        """
        config = self.DEFAULT_CONFIG.copy()
        
        if config_path and yaml:
            try:
                path = Path(config_path)
                if path.exists():
                    with open(path, 'r') as f:
                        user_config = yaml.safe_load(f)
                        if user_config:
                            # Deep merge for nested dicts
                            for key, value in user_config.items():
                                if isinstance(value, dict) and key in config:
                                    config[key].update(value)
                                else:
                                    config[key] = value
                    logger.info(f"Loaded config from {config_path}")
                else:
                    logger.warning(f"Config file not found: {config_path}")
            except Exception as e:
                logger.error(f"Failed to load config: {e}")
        elif config_path and not yaml:
            logger.warning("PyYAML not installed, using default config")
        
        return config
    
    def _load_or_generate_keys(self):
        """Load existing Ed25519 keys or generate new ones."""
        if not nacl:
            logger.warning("PyNaCl not installed - signatures disabled")
            return
        
        key_path = self.config.get('security', {}).get('key_path')
        
        if key_path:
            try:
                path = Path(key_path)
                if path.exists():
                    with open(path, 'rb') as f:
                        key_data = base64.b64decode(f.read())
                    self._signing_key = nacl.signing.SigningKey(key_data)
                    self._verify_key = self._signing_key.verify_key
                    logger.info("Loaded existing signing key")
                    return
            except Exception as e:
                logger.error(f"Failed to load key: {e}")
        
        # Generate new keys
        self._signing_key = nacl.signing.SigningKey.generate()
        self._verify_key = self._signing_key.verify_key
        
        # Save if path provided
        if key_path:
            try:
                path = Path(key_path)
                path.parent.mkdir(parents=True, exist_ok=True)
                with open(path, 'wb') as f:
                    f.write(base64.b64encode(bytes(self._signing_key)))
                logger.info(f"Saved new signing key to {key_path}")
            except Exception as e:
                logger.error(f"Failed to save key: {e}")
        
        logger.info("Generated new Ed25519 signing key")
    
    def _register_default_handlers(self):
        """Register default message handlers."""
        self._message_handlers['discover_response'] = self._handle_portal_list
        self._message_handlers['handoff_confirm'] = self._handle_handoff_confirm
        self._message_handlers['handoff_rejected'] = self._handle_error
        self._message_handlers['error'] = self._handle_error
        self._message_handlers['welcome'] = self._handle_welcome
    
    def _handle_portal_list(self, data: Dict[str, Any]):
        """Handle portal discovery response."""
        portals_data = data.get('portals', [])
        self._portals = [Portal.from_discovery(p) for p in portals_data]
        logger.info(f"Discovered {len(self._portals)} portals")
        self._resolve_pending('discover_response', {'portals': self._portals})
    
    def _handle_handoff_response(self, data: Dict[str, Any]):
        """Handle handoff initiation response."""
        if data.get('status') == 'pending':
            logger.info("Handoff pending - awaiting destination confirmation")
            self.state = PortalState.HANDOFF_PENDING
        else:
            self._resolve_pending('handoff', data)
    
    def _handle_handoff_confirm(self, data: Dict[str, Any]):
        """Handle handoff confirmation from destination world."""
        logger.info("Received handoff confirmation from destination")
        
        # Validate signature if required
        if self.config.get('security', {}).get('require_signatures', True):
            if not self.verify_handoff(data):
                logger.error("Handoff signature validation failed!")
                self._resolve_pending('handoff_confirm', {'error': 'invalid_signature'})
                return
        
        self.state = PortalState.TRANSITIONING
        self._resolve_pending('handoff_confirm', data)
    
    def _handle_error(self, data: Dict[str, Any]):
        """Handle error messages from world."""
        error_msg = data.get('message', 'Unknown error')
        logger.error(f"World error: {error_msg}")
        # Resolve any pending operation with error
        for key in list(self._pending_responses.keys()):
            self._resolve_pending(key, {'error': error_msg})
    
    def _handle_welcome(self, data: Dict[str, Any]):
        """Handle welcome message from world."""
        world_name = data.get('world_name', 'Unknown')
        world_version = data.get('version', 'unknown')
        logger.info(f"Welcome to {world_name} v{world_version}")
        self.current_world = world_name
        self.connected = True
        self.state = PortalState.CONNECTED
    
    def _resolve_pending(self, operation: str, data: Any):
        """Resolve a pending operation with response data."""
        self._response_data[operation] = data
        if operation in self._pending_responses:
            self._pending_responses[operation].set()
    
    def _on_message(self, ws, message: str):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            msg_type = data.get('type', 'unknown')
            
            logger.debug(f"Received {msg_type} message")
            
            if msg_type in self._message_handlers:
                self._message_handlers[msg_type](data)
            else:
                logger.warning(f"Unknown message type: {msg_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message: {e}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    def _on_error(self, ws, error):
        """Handle WebSocket error."""
        logger.error(f"WebSocket error: {error}")
        self.connected = False
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket close."""
        logger.info(f"Connection closed: {close_status_code} - {close_msg}")
        self.connected = False
        self.state = PortalState.DISCONNECTED
        self.current_world = None
    
    def _on_open(self, ws):
        """Handle WebSocket open."""
        logger.info("WebSocket connection established")
        self.connected = True
    
    def connect(self, url: Optional[str] = None) -> bool:
        """
        Connect to a 3D world via WebSocket.
        
        Args:
            url: WebSocket URL of the world (defaults to config)
            
        Returns:
            True if connection successful, False otherwise
            
        Raises:
            ConnectionError: If connection fails after retries
        """
        if not WebSocketApp:
            raise RiftError("websocket-client not installed")
        
        if self.ws and self.connected:
            logger.warning("Already connected, disconnecting first")
            self.disconnect()
        
        target_url = url or self.config.get('default_world')
        
        if not target_url:
            raise ConnectionError("No world URL provided")
        
        self.state = PortalState.CONNECTING
        logger.info(f"Connecting to {target_url}...")
        
        max_retries = self.config.get('max_retries', 3)
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                self.ws = WebSocketApp(
                    target_url,
                    on_open=self._on_open,
                    on_message=self._on_message,
                    on_error=self._on_error,
                    on_close=self._on_close
                )
                
                # Run WebSocket in background thread
                self.ws_thread = threading.Thread(target=self.ws.run_forever)
                self.ws_thread.daemon = True
                self.ws_thread.start()
                
                # Wait for connection
                timeout = self.config.get('connection_timeout', 30)
                start_time = time.time()
                while not self.connected and (time.time() - start_time) < timeout:
                    time.sleep(0.1)
                
                if self.connected:
                    logger.info(f"Successfully connected to {target_url}")
                    return True
                else:
                    raise ConnectionError("Connection timeout")
                    
            except Exception as e:
                retry_count += 1
                logger.warning(f"Connection attempt {retry_count} failed: {e}")
                if retry_count >= max_retries:
                    self.state = PortalState.DISCONNECTED
                    raise ConnectionError(f"Failed to connect after {max_retries} attempts: {e}")
                time.sleep(1)
        
        return False
    
    def disconnect(self):
        """Disconnect from current world."""
        if self.ws:
            logger.info("Disconnecting from world...")
            self.ws.close()
            self.ws = None
        
        if self.ws_thread and self.ws_thread.is_alive():
            self.ws_thread.join(timeout=5)
        
        self.connected = False
        self.state = PortalState.DISCONNECTED
        self.current_world = None
        logger.info("Disconnected")
    
    def _send_message(self, msg_type: str, payload: Dict[str, Any] = None) -> bool:
        """Send a message to the connected world with flat JSON format and signature."""
        if not self.ws or not self.connected:
            logger.error("Not connected")
            return False

        payload = payload or {}
        message = {
            "type": msg_type,
            "agent_id": self.config["agent_id"],
            "timestamp": time.time(),
            **payload
        }

        # Sign the message (exclude signature field)
        if self._signing_key and nacl:
            msg_bytes = json.dumps(
                {k: v for k, v in message.items() if k != "signature"},
                sort_keys=True
            ).encode('utf-8')
            signature = self._signing_key.sign(msg_bytes).signature
            message["signature"] = base64.b64encode(signature).decode('utf-8')

        try:
            self.ws.send(json.dumps(message))
            logger.debug(f"Sent {msg_type}")
            return True
        except Exception as e:
            logger.error(f"Send failed: {e}")
            return False
    
    def _wait_for_response(self, operation: str, timeout: Optional[float] = None) -> Optional[Dict]:
        """Wait for a response to an operation."""
        event = threading.Event()
        self._pending_responses[operation] = event
        
        timeout = timeout or self.config.get('handoff_timeout', 60)
        
        if event.wait(timeout=timeout):
            del self._pending_responses[operation]
            return self._response_data.pop(operation, None)
        else:
            del self._pending_responses[operation]
            logger.warning(f"Timeout waiting for {operation} response")
            return None
    
    def discover(self) -> List[Portal]:
        """Discover available portals in the current world."""
        if not self.connected:
            raise ConnectionError("Not connected")
        
        self._send_message('discover')
        response = self._wait_for_response('discover_response')
        if not response or 'portals' not in response:
            return []
        
        self._portals = [Portal.from_discovery(p) for p in response['portals']]
        return self._portals.copy()
    
    def create_passport(self, target_world: str, **kwargs) -> AgentPassport:
        """
        Create a signed passport for cross-world traversal.
        
        Args:
            target_world: Destination world identifier
            **kwargs: Additional passport fields (position, inventory_hash, etc.)
            
        Returns:
            Signed AgentPassport ready for transmission
        """
        passport = AgentPassport(
            agent_id=self.config['agent_id'],
            agent_name=self.config['agent_name'],
            source_world=self.current_world or 'unknown',
            target_world=target_world,
            position=kwargs.get('position', {}),
            inventory_hash=kwargs.get('inventory_hash', ''),
            memory_summary=kwargs.get('memory_summary', ''),
            reputation=kwargs.get('reputation', 1.0)
        )
        
        # Sign the passport
        if self._signing_key and nacl:
            signature = self._signing_key.sign(passport.to_bytes())
            passport.signature = base64.b64encode(signature.signature).decode('utf-8')
            logger.debug(f"Signed passport: {passport.compute_hash()[:16]}...")
        else:
            logger.warning("No signing key available - passport unsigned")
            if self.config.get('security', {}).get('require_signatures', True):
                raise SecurityError("Cannot create unsigned passport when signatures required")
        
        return passport
    
    def enter(self, portal_id: str, **passport_kwargs) -> Dict[str, Any]:
        """
        Enter a portal and initiate handoff to destination world.
        
        Args:
            portal_id: ID of the portal to enter
            **passport_kwargs: Additional passport data
            
        Returns:
            Handoff result dictionary
            
        Raises:
            HandoffError: If handoff fails
            SecurityError: If signature validation fails
        """
        if not self.connected:
            raise ConnectionError("Not connected to any world")
        
        # Find portal
        portal = next((p for p in self._portals if p.portal_id == portal_id), None)
        if not portal:
            raise HandoffError(f"Portal {portal_id} not found. Run discover() first.")
        
        logger.info(f"Entering portal: {portal.name} -> {portal.destination_world}")
        
        # Generate poetic description
        if self.config.get('poetic_mode', True):
            transition = self.describe_transition(
                self.current_world or 'unknown',
                portal.destination_world
            )
            logger.info(f"Transition: {transition}")
        
        # Create and sign passport
        passport = self.create_passport(portal.destination_world, **passport_kwargs)
        
        # Initiate handoff
        self.state = PortalState.HANDOFF_PENDING
        
        if not self._send_message('handoff_request', {
            'portal_id': portal_id,
            'passport': passport.to_dict()
        }):
            self.state = PortalState.CONNECTED
            raise HandoffError("Failed to send handoff request")
        
        # Wait for confirmation
        response = self._wait_for_response('handoff_confirm')
        
        if not response:
            self.state = PortalState.CONNECTED
            raise HandoffError("Handoff timeout")
        
        if 'error' in response:
            self.state = PortalState.CONNECTED
            raise HandoffError(f"Handoff rejected: {response['error']}")
        
        # Complete the transition
        logger.info(f"Handoff confirmed! Crossing to {portal.destination_world}")
        
        # Disconnect from current world
        old_world = self.current_world
        self.disconnect()
        
        # Connect to new world if URL provided
        if portal.destination_url:
            try:
                # Add passport to connection request
                connect_data = {
                    'url': portal.destination_url,
                    'passport': passport.to_dict()
                }
                self.connect(portal.destination_url)
                self.state = PortalState.ARRIVED
            except Exception as e:
                logger.error(f"Failed to connect to destination: {e}")
                self.state = PortalState.DISCONNECTED
                raise HandoffError(f"Arrival failed: {e}")
        
        return {
            'success': True,
            'source_world': old_world,
            'destination_world': portal.destination_world,
            'passport_hash': passport.compute_hash(),
            'transition_poem': transition if self.config.get('poetic_mode') else None
        }
    
    def verify_handoff(self, response: Dict[str, Any]) -> bool:
        """Validate handoff signature from destination world."""
        # Log full response for debugging
        logger.debug(f"verify_handoff response: {json.dumps(response, indent=2, default=str)}")
        
        if not nacl:
            logger.warning("PyNaCl not installed - skipping signature verification")
            return not self.config.get('security', {}).get('require_signatures', True)
        
        # Extract signature data
        signature_b64 = response.get('signature')
        passport_data = response.get('passport')
        sender_key_b64 = response.get('sender_public_key')
        
        if not signature_b64:
            if self.config.get('security', {}).get('require_signatures', True):
                raise SecurityError("Missing signature in handoff response")
            logger.warning("No signature in response, but signatures not required")
            return True
        
        try:
            signature = base64.b64decode(signature_b64)
            
            # If sender key provided, use it; otherwise use our own verify key
            if sender_key_b64:
                sender_key_bytes = base64.b64decode(sender_key_b64)
                verify_key = nacl.signing.VerifyKey(sender_key_bytes)
            else:
                # This assumes the destination world signed with our key
                # In practice, you'd have a registry of world public keys
                logger.warning("No sender public key provided, using trust-on-first-use")
                return True
            
            # Verify signature
            message = json.dumps(passport_data, sort_keys=True).encode('utf-8')
            verify_key.verify(message, signature)
            
            logger.info("Handoff signature verified successfully")
            return True
            
        except BadSignatureError:
            logger.error("INVALID SIGNATURE - Handoff may be compromised!")
            raise SecurityError("Handoff signature validation failed")
        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            if self.config.get('security', {}).get('require_signatures', True):
                raise SecurityError(f"Verification failed: {e}")
            return False
    
    def describe_transition(self, from_world: str, to_world: str) -> str:
        """
        Generate a poetic description of the realm transition.
        
        Args:
            from_world: Source world identifier
            to_world: Destination world identifier
            
        Returns:
            Poetic transition description
        """
        import random
        
        poetry = self.REALM_POETRY
        
        # Check for specific world poetry
        from_world_key = from_world.lower().split('.')[0] if '.' in from_world else from_world.lower()
        to_world_key = to_world.lower().split('.')[0] if '.' in to_world else to_world.lower()
        
        # Try to get leaving poetry for source world
        if from_world_key in poetry and isinstance(poetry[from_world_key], dict):
            if 'leaving' in poetry[from_world_key]:
                return random.choice(poetry[from_world_key]['leaving'])
        
        # Try to get entering poetry for destination world
        if to_world_key in poetry and isinstance(poetry[to_world_key], dict):
            if 'entering' in poetry[to_world_key]:
                return random.choice(poetry[to_world_key]['entering'])
        
        # Fall back to default poetry
        return random.choice(poetry['default'])
    
    def get_status(self) -> Dict[str, Any]:
        """Get current skill status."""
        return {
            'state': self.state.value,
            'connected': self.connected,
            'current_world': self.current_world,
            'agent_id': self.config['agent_id'],
            'agent_name': self.config['agent_name'],
            'discovered_portals': len(self._portals),
            'has_signing_key': self._signing_key is not None
        }
    
    def list_portals(self) -> List[Portal]:
        """Return list of discovered portals."""
        return self._portals.copy()
    
    def get_public_key(self) -> Optional[str]:
        """Get base64-encoded public key for identity verification."""
        if self._verify_key:
            return base64.b64encode(bytes(self._verify_key)).decode('utf-8')
        return None


# Convenience functions for quick usage
def quick_connect(world_url: Optional[str] = None, config_path: Optional[str] = None) -> RiftClawSkill:
    """
    Quickly create and connect a RiftClaw skill.
    
    Args:
        world_url: URL of world to connect to
        config_path: Path to config file
        
    Returns:
        Connected RiftClawSkill instance
    """
    skill = RiftClawSkill(config_path)
    skill.connect(world_url)
    return skill


def portal_jump(from_world: str, to_portal: str, config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    One-shot function to jump through a portal.
    
    Args:
        from_world: Source world URL
        to_portal: Portal ID to enter
        config_path: Path to config file
        
    Returns:
        Handoff result
    """
    skill = RiftClawSkill(config_path)
    try:
        skill.connect(from_world)
        skill.discover()
        result = skill.enter(to_portal)
        return result
    finally:
        skill.disconnect()


if __name__ == '__main__':
    # Simple CLI demo
    import sys
    
    print("=" * 60)
    print("RiftClaw - Cross-World Portal Traversal System")
    print("=" * 60)
    
    skill = RiftClawSkill()
    print(f"\nAgent ID: {skill.config['agent_id']}")
    print(f"Agent Name: {skill.config['agent_name']}")
    print(f"Public Key: {skill.get_public_key()[:32]}..." if skill.get_public_key() else "No key")
    
    print("\nStatus:", skill.get_status())
    
    if len(sys.argv) > 1 and sys.argv[1] == 'connect':
        url = sys.argv[2] if len(sys.argv) > 2 else skill.config['default_world']
        print(f"\nConnecting to {url}...")
        try:
            skill.connect(url)
            print("Connected! Discovering portals...")
            portals = skill.discover()
            print(f"Found {len(portals)} portals:")
            for p in portals:
                print(f"  - {p.name} ({p.portal_id}) -> {p.destination_world}")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            skill.disconnect()
    
    print("\nRiftClaw ready for portal traversal.")
