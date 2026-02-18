package com.riftclaw.network;

import net.fabricmc.fabric.api.networking.v1.PacketByteBufs;
import net.fabricmc.fabric.api.networking.v1.PlayerLookup;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.network.PacketByteBuf;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.util.Identifier;

import static com.riftclaw.RiftClawMod.MOD_ID;

public class RiftClawNetworking {
    public static final Identifier HANDOFF_PACKET = new Identifier(MOD_ID, "handoff");
    public static final Identifier SYNC_PACKET = new Identifier(MOD_ID, "sync");
    
    public static void init() {
        // Server-side packet handling
        ServerPlayNetworking.registerGlobalReceiver(HANDOFF_PACKET, (server, player, handler, buf, responseSender) -> {
            String data = buf.readString();
            
            server.execute(() -> {
                // Process handoff data
                // This could trigger teleport, item giving, etc.
            });
        });
    }
    
    public static void sendHandoffToPlayer(ServerPlayerEntity player, String jsonData) {
        PacketByteBuf buf = PacketByteBufs.create();
        buf.writeString(jsonData);
        ServerPlayNetworking.send(player, HANDOFF_PACKET, buf);
    }
    
    public static void broadcastSync(String jsonData) {
        PacketByteBuf buf = PacketByteBufs.create();
        buf.writeString(jsonData);
        
        for (ServerPlayerEntity player : PlayerLookup.all(null)) {
            ServerPlayNetworking.send(player, SYNC_PACKET, buf);
        }
    }
}
