#!/usr/bin/env python3
"""
RiftClaw Usage Examples
=======================
Demonstrates how to use the RiftClaw skill for cross-world portal traversal.
"""

from riftclaw import RiftClawSkill, quick_connect, portal_jump
import time


def example_1_basic_connection():
    """Example 1: Basic connection to default world."""
    print("=" * 60)
    print("Example 1: Basic Connection")
    print("=" * 60)
    
    # Create skill with default config
    skill = RiftClawSkill()
    print(f"Created agent: {skill.config['agent_name']}")
    print(f"Agent ID: {skill.config['agent_id']}")
    
    # Connect to default world
    try:
        skill.connect()  # Uses wss://molt.space/lobby by default
        print(f"Connected! Status: {skill.get_status()}")
    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        skill.disconnect()


def example_2_custom_config():
    """Example 2: Using custom configuration."""
    print("\n" + "=" * 60)
    print("Example 2: Custom Configuration")
    print("=" * 60)
    
    # Create skill with config file
    skill = RiftClawSkill(config_path="./riftclaw_config.yaml")
    print(f"Loaded config for: {skill.config['agent_name']}")
    
    # Or create inline config by modifying after init
    skill.config['agent_name'] = 'CyberNomad_42'
    skill.config['poetic_mode'] = True
    print(f"Updated name: {skill.config['agent_name']}")


def example_3_discover_portals():
    """Example 3: Discover available portals."""
    print("\n" + "=" * 60)
    print("Example 3: Portal Discovery")
    print("=" * 60)
    
    skill = RiftClawSkill()
    
    try:
        skill.connect("wss://molt.space/lobby")
        
        # Discover portals
        portals = skill.discover()
        print(f"Found {len(portals)} portals:")
        
        for portal in portals:
            print(f"\n  📍 {portal.name}")
            print(f"     ID: {portal.portal_id}")
            print(f"     Destination: {portal.destination_world}")
            print(f"     Position: {portal.position}")
            print(f"     Auth Required: {portal.requires_auth}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        skill.disconnect()


def example_4_portal_traversal():
    """Example 4: Traverse through a portal with full passport."""
    print("\n" + "=" * 60)
    print("Example 4: Portal Traversal")
    print("=" * 60)
    
    skill = RiftClawSkill()
    
    try:
        # Connect to source world
        skill.connect("wss://molt.space/lobby")
        print(f"Connected to: {skill.current_world}")
        
        # Discover portals
        portals = skill.discover()
        if not portals:
            print("No portals available")
            return
        
        # Select first portal
        target_portal = portals[0]
        print(f"\nSelected portal: {target_portal.name}")
        
        # Get poetic transition description
        transition = skill.describe_transition(
            skill.current_world,
            target_portal.destination_world
        )
        print(f"\n🌀 {transition}")
        
        # Prepare passport data
        passport_data = {
            'position': {'x': 10.5, 'y': 2.0, 'z': -3.7},
            'inventory_hash': 'a1b2c3d4e5f6...',
            'memory_summary': 'Learned portal mechanics, met 3 other agents',
            'reputation': 4.7
        }
        
        # Create passport (auto-signed)
        passport = skill.create_passport(
            target_portal.destination_world,
            **passport_data
        )
        print(f"\n📜 Passport created:")
        print(f"   Hash: {passport.compute_hash()[:16]}...")
        print(f"   Signed: {passport.signature is not None}")
        
        # Enter portal
        print(f"\n🚪 Entering portal...")
        result = skill.enter(target_portal.portal_id, **passport_data)
        
        if result.get('success'):
            print(f"✅ Successfully arrived at {result['destination_world']}!")
            print(f"   Transition poem: {result.get('transition_poem')}")
        
    except Exception as e:
        print(f"Traversal failed: {e}")
    finally:
        skill.disconnect()


def example_5_quick_traversal():
    """Example 5: One-shot portal jump."""
    print("\n" + "=" * 60)
    print("Example 5: Quick Portal Jump")
    print("=" * 60)
    
    # Jump in one line
    try:
        result = portal_jump(
            from_world="wss://molt.space/lobby",
            to_portal="portal_cyber_01"
        )
        print(f"Jump result: {result}")
    except Exception as e:
        print(f"Jump failed: {e}")


def example_6_security_verification():
    """Example 6: Manual signature verification."""
    print("\n" + "=" * 60)
    print("Example 6: Security Verification")
    print("=" * 60)
    
    skill = RiftClawSkill()
    
    # Create a passport
    passport = skill.create_passport(
        target_world="cyber_realm",
        position={'x': 0, 'y': 0, 'z': 0},
        inventory_hash="test_hash"
    )
    
    print(f"Passport created:")
    print(f"  Agent: {passport.agent_name}")
    print(f"  Source: {passport.source_world}")
    print(f"  Target: {passport.target_world}")
    print(f"  Signature: {passport.signature[:32]}..." if passport.signature else "  Unsigned")
    
    # Simulate handoff response verification
    mock_response = {
        'passport': passport.to_dict(),
        'signature': passport.signature,
        'sender_public_key': skill.get_public_key()
    }
    
    try:
        is_valid = skill.verify_handoff(mock_response)
        print(f"\nSignature valid: {is_valid}")
    except Exception as e:
        print(f"\nVerification error: {e}")


def example_7_poetic_transitions():
    """Example 7: Generate poetic realm transitions."""
    print("\n" + "=" * 60)
    print("Example 7: Poetic Transitions")
    print("=" * 60)
    
    skill = RiftClawSkill()
    
    transitions = [
        ("molt.space", "cyber_realm"),
        ("cyber_realm", "void"),
        ("void", "molt.space"),
        ("unknown_world", "another_world")
    ]
    
    for from_world, to_world in transitions:
        poem = skill.describe_transition(from_world, to_world)
        print(f"\n{from_world} → {to_world}:")
        print(f"  \"{poem}\"")


def example_8_error_handling():
    """Example 8: Proper error handling."""
    print("\n" + "=" * 60)
    print("Example 8: Error Handling")
    print("=" * 60)
    
    from riftclaw import RiftError, ConnectionError, SecurityError, HandoffError
    
    skill = RiftClawSkill()
    
    try:
        # Try operations that might fail
        skill.connect("wss://invalid.world/nowhere")
        
    except ConnectionError as e:
        print(f"Connection error (expected): {e}")
        
    except RiftError as e:
        print(f"RiftClaw error: {e}")
        
    except Exception as e:
        print(f"Unexpected error: {e}")
        
    finally:
        skill.disconnect()


def example_9_event_handlers():
    """Example 9: Custom message handlers."""
    print("\n" + "=" * 60)
    print("Example 9: Custom Event Handlers")
    print("=" * 60)
    
    skill = RiftClawSkill()
    
    # Register custom handler for specific message type
    def on_custom_event(data):
        print(f"Received custom event: {data}")
    
    skill._message_handlers['custom_event'] = on_custom_event
    print("Registered custom event handler")
    
    # Now messages of type 'custom_event' will trigger the handler
    print("Handlers registered:", list(skill._message_handlers.keys()))


def example_10_full_workflow():
    """Example 10: Complete agent workflow."""
    print("\n" + "=" * 60)
    print("Example 10: Complete Agent Workflow")
    print("=" * 60)
    
    skill = RiftClawSkill()
    
    try:
        # Step 1: Connect
        print("1. Connecting to lobby...")
        skill.connect()
        
        # Step 2: Discover
        print("2. Discovering portals...")
        portals = skill.discover()
        
        if len(portals) < 2:
            print("Need at least 2 portals for full demo")
            return
        
        # Step 3: Traverse through multiple worlds
        visited = [skill.current_world]
        
        for i, portal in enumerate(portals[:3]):  # Visit up to 3 worlds
            print(f"\n3.{i+1}. Traveling to {portal.destination_world}...")
            
            result = skill.enter(portal.portal_id, 
                position={'x': i * 10, 'y': 0, 'z': 0},
                memory_summary=f"Visited {len(visited)} worlds so far"
            )
            
            if result.get('success'):
                visited.append(result['destination_world'])
                print(f"   ✓ Now in {skill.current_world}")
                
                # Discover new portals in this world
                new_portals = skill.discover()
                print(f"   Found {len(new_portals)} new portals here")
            
            time.sleep(1)  # Brief pause between jumps
        
        print(f"\n✅ Journey complete! Visited: {visited}")
        
    except Exception as e:
        print(f"Workflow error: {e}")
    finally:
        skill.disconnect()
        print("Disconnected.")


if __name__ == '__main__':
    print("RiftClaw Examples")
    print("Run individual examples by calling them directly.")
    print("")
    print("Available examples:")
    print("  1. example_1_basic_connection()")
    print("  2. example_2_custom_config()")
    print("  3. example_3_discover_portals()")
    print("  4. example_4_portal_traversal()")
    print("  5. example_5_quick_traversal()")
    print("  6. example_6_security_verification()")
    print("  7. example_7_poetic_transitions()")
    print("  8. example_8_error_handling()")
    print("  9. example_9_event_handlers()")
    print(" 10. example_10_full_workflow()")
    print("")
    print("Or run all examples:")
    print("  run_all_examples()")
    
    # Uncomment to run specific examples:
    # example_1_basic_connection()
    # example_2_custom_config()
    # example_6_security_verification()
    # example_7_poetic_transitions()
