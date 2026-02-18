package com.riftclaw.client;

import com.google.gson.Gson;
import com.riftclaw.RiftClawClient;
import net.minecraft.client.MinecraftClient;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.text.Text;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

public class RelayClient extends WebSocketClient {
    private final Gson gson = new Gson();
    private boolean connected = false;
    private String pendingInventory = null;
    
    public RelayClient(String serverUri) {
        super(URI.create(serverUri));
    }
    
    @Override
    public void onOpen(ServerHandshake handshake) {
        RiftClawClient.LOGGER.info("Connected to RiftClaw relay!");
        connected = true;
        
        // Send discover message
        sendDiscover();
    }
    
    @Override
    public void onMessage(String message) {
        try {
            Map<String, Object> msg = gson.fromJson(message, Map.class);
            String type = (String) msg.get("type");
            
            RiftClawClient.LOGGER.info("Received: " + type);
            
            switch (type) {
                case "welcome":
                    handleWelcome(msg);
                    break;
                case "handoff_confirm":
                    handleHandoffConfirm(msg);
                    break;
                case "handoff_request":
                    handleHandoffRequest(msg);
                    break;
                case "discover_response":
                    handleDiscoverResponse(msg);
                    break;
                default:
                    RiftClawClient.LOGGER.warn("Unknown message type: " + type);
            }
        } catch (Exception e) {
            RiftClawClient.LOGGER.error("Error handling message: " + e.getMessage());
        }
    }
    
    @Override
    public void onClose(int code, String reason, boolean remote) {
        RiftClawClient.LOGGER.info("Disconnected from relay: " + reason);
        connected = false;
    }
    
    @Override
    public void onError(Exception ex) {
        RiftClawClient.LOGGER.error("WebSocket error: " + ex.getMessage());
    }
    
    public boolean isConnected() {
        return connected && this.isOpen();
    }
    
    public void connect() {
        try {
            super.connect();
        } catch (Exception e) {
            RiftClawClient.LOGGER.error("Failed to connect: " + e.getMessage());
        }
    }
    
    // === Protocol Methods ===
    
    public void sendDiscover() {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "discover");
        msg.put("agent_id", "minecraft-client");
        msg.put("timestamp", System.currentTimeMillis() / 1000.0);
        send(gson.toJson(msg));
    }
    
    public void sendHandoffRequest(Map<String, Object> passport) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "handoff_request");
        msg.put("agent_id", passport.get("agent_id"));
        msg.put("portal_id", "minecraft-rift-portal");
        msg.put("passport", passport);
        msg.put("timestamp", System.currentTimeMillis() / 1000.0);
        send(gson.toJson(msg));
    }
    
    // === Message Handlers ===
    
    private void handleWelcome(Map<String, Object> msg) {
        String worldName = (String) msg.get("world_name");
        RiftClawClient.LOGGER.info("Welcome to relay! World: " + worldName);
    }
    
    private void handleHandoffConfirm(Map<String, Object> msg) {
        RiftClawClient.LOGGER.info("Handoff confirmed!");
        
        Map<String, Object> passport = (Map<String, Object>) msg.get("passport");
        if (passport != null) {
            // Show success message
            MinecraftClient.getInstance().execute(() -> {
                if (MinecraftClient.getInstance().player != null) {
                    MinecraftClient.getInstance().player.sendMessage(
                        Text.literal("§a§l✓ Handoff successful! Check your browser."), true);
                }
            });
        }
    }
    
    private void handleHandoffRequest(Map<String, Object> msg) {
        // Browser wants to send player TO Minecraft
        Map<String, Object> passport = (Map<String, Object>) msg.get("passport");
        if (passport == null) return;
        
        String agentName = (String) passport.get("agent_name");
        String inventory = (String) passport.get("inventory");
        
        RiftClawClient.LOGGER.info("Receiving handoff from browser: " + agentName);
        
        // Store inventory for application
        pendingInventory = inventory;
        
        // Execute on main thread
        MinecraftClient.getInstance().execute(() -> {
            PlayerEntity player = MinecraftClient.getInstance().player;
            if (player != null) {
                // Teleport to spawn
                player.teleport(0, 64, 0);
                
                // Give items from browser
                if (pendingInventory != null) {
                    giveItemsFromInventory(player, pendingInventory);
                }
                
                player.sendMessage(Text.literal("§b§l🌀 Welcome from RiftClaw browser world!"), false);
            }
        });
        
        // Send confirm
        Map<String, Object> confirm = new HashMap<>();
        confirm.put("type", "handoff_confirm");
        confirm.put("agent_id", passport.get("agent_id"));
        confirm.put("portal_id", msg.get("portal_id"));
        confirm.put("passport", passport);
        confirm.put("timestamp", System.currentTimeMillis() / 1000.0);
        send(gson.toJson(confirm));
    }
    
    private void handleDiscoverResponse(Map<String, Object> msg) {
        java.util.List<Map<String, Object>> portals = (java.util.List<Map<String, Object>>) msg.get("portals");
        if (portals != null) {
            RiftClawClient.LOGGER.info("Discovered " + portals.size() + " portals");
        }
    }
    
    private void giveItemsFromInventory(PlayerEntity player, String inventoryJson) {
        try {
            // Parse simple JSON array format
            if (inventoryJson.contains("Portal Shard")) {
                player.giveItemStack(new ItemStack(Items.DIAMOND, 1));
            }
            if (inventoryJson.contains("Data Crystal")) {
                player.giveItemStack(new ItemStack(Items.EMERALD, 1));
            }
            
            // Add more item mappings here
            // This is a simplified version - could be expanded with full NBT support
            
        } catch (Exception e) {
            RiftClawClient.LOGGER.error("Error giving items: " + e.getMessage());
        }
    }
}
