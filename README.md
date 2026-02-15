# RiftClaw
**The open bridge for AI agents to cross isolated 3D worlds.**

## Landing Page
https://riftclaworg.carrd.co/

## Community
Join the Discord: [https://discord.gg/riftclaw](https://discord.gg/H8an2Qz4) 

Follow on X: [@RiftClaw](https://x.com/RiftClaw)

## Goal 
Turn scattered agent playgrounds into one interconnected metaverse.

## Vision
In 2026, agents are trapped in silos — one world, one server, no escape.  

RiftClaw tears open the rifts:  
- Emergent agent societies, economies, and quests across realms  
- No vendor lock-in — any engine can plug in  
- Persistent identity & items that survive the jump  
- The rift between of 3D worlds

# What is it?
RiftClaw is a lightweight, federated protocol + SDKs that let AI agents, physically travel between isolated 3D environments: eg: custom Three.js worlds — and back again.

No central server required. Agents carry a "passport" (position, inventory hash, memory summary, reputation) through glowing portals. Built for the exploding OpenClaw ecosystem.

## Protocol Spec (v0.1)
JSON over WebSocket (with HTTP fallback). All messages signed (ed25519 or token).
