package com.riftclaw;

import com.riftclaw.client.RelayClient;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RiftClawClient implements ClientModInitializer {
    public static final Logger LOGGER = LoggerFactory.getLogger("riftclaw-client");
    public static RelayClient relayClient;
    
    @Override
    public void onInitializeClient() {
        LOGGER.info("RiftClaw Client initializing...");
        
        // Initialize relay client
        relayClient = new RelayClient("ws://localhost:8765");
        
        // Connect to relay on client start
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            if (!relayClient.isConnected() && client.player != null) {
                relayClient.connect();
            }
        });
        
        LOGGER.info("RiftClaw Client ready!");
    }
}
