package com.riftclaw.block.entity;

import com.riftclaw.RiftClawClient;
import com.riftclaw.RiftClawMod;
import net.minecraft.block.BlockState;
import net.minecraft.block.entity.BlockEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NbtCompound;
import net.minecraft.nbt.NbtList;
import net.minecraft.network.listener.ClientPlayPacketListener;
import net.minecraft.network.packet.Packet;
import net.minecraft.network.packet.s2c.play.BlockEntityUpdateS2CPacket;
import net.minecraft.util.math.BlockPos;

import java.util.HashMap;
import java.util.Map;

public class RiftPortalBlockEntity extends BlockEntity {
    private long lastHandoffTime = 0;
    private static final long HANDOFF_COOLDOWN = 5000; // 5 seconds
    
    public RiftPortalBlockEntity(BlockPos pos, BlockState state) {
        super(RiftClawMod.RIFT_PORTAL_BLOCK_ENTITY, pos, state);
    }
    
    public boolean canTriggerHandoff() {
        return System.currentTimeMillis() - lastHandoffTime > HANDOFF_COOLDOWN;
    }
    
    public void triggerHandoff(PlayerEntity player) {
        lastHandoffTime = System.currentTimeMillis();
        
        RiftClawMod.LOGGER.info("Triggering handoff for player: " + player.getName().getString());
        
        // Collect player data for passport
        Map<String, Object> passport = createPassport(player);
        
        // Send to relay via WebSocket
        if (RiftClawClient.relayClient != null && RiftClawClient.relayClient.isConnected()) {
            RiftClawClient.relayClient.sendHandoffRequest(passport);
            player.sendMessage(net.minecraft.text.Text.literal("§b§l🌀 Opening Rift to browser world..."), true);
        } else {
            player.sendMessage(net.minecraft.text.Text.literal("§c§l❌ RiftClaw relay not connected!"), true);
        }
    }
    
    private Map<String, Object> createPassport(PlayerEntity player) {
        Map<String, Object> passport = new HashMap<>();
        
        // Agent info
        passport.put("agent_id", "mc-" + player.getUuid().toString());
        passport.put("agent_name", player.getName().getString());
        passport.put("source_world", "minecraft-overworld");
        passport.put("target_world", "lobby");
        
        // Position
        Map<String, Double> position = new HashMap<>();
        position.put("x", player.getX());
        position.put("y", player.getY());
        position.put("z", player.getZ());
        passport.put("position", position);
        
        // Inventory
        passport.put("inventory", serializeInventory(player));
        passport.put("inventory_hash", String.valueOf(player.getInventory().hashCode()));
        
        // Metadata
        passport.put("health", player.getHealth());
        passport.put("food", player.getHungerManager().getFoodLevel());
        passport.put("timestamp", System.currentTimeMillis() / 1000.0);
        passport.put("nonce", java.util.UUID.randomUUID().toString().substring(0, 8));
        passport.put("reputation", 5.0);
        passport.put("memory_summary", "Crossing from Minecraft to RiftClaw browser world");
        
        return passport;
    }
    
    private String serializeInventory(PlayerEntity player) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        
        boolean first = true;
        for (int i = 0; i < player.getInventory().size(); i++) {
            ItemStack stack = player.getInventory().getStack(i);
            if (!stack.isEmpty()) {
                if (!first) sb.append(",");
                first = false;
                
                sb.append("{");
                sb.append("\"name\":\"").append(stack.getName().getString()).append("\",");
                sb.append("\"item\":\"").append(net.minecraft.registry.Registries.ITEM.getId(stack.getItem())).append("\",");
                sb.append("\"quantity\":").append(stack.getCount());
                sb.append("}");
            }
        }
        
        sb.append("]");
        return sb.toString();
    }
    
    @Override
    protected void writeNbt(NbtCompound nbt) {
        super.writeNbt(nbt);
        nbt.putLong("lastHandoff", lastHandoffTime);
    }
    
    @Override
    public void readNbt(NbtCompound nbt) {
        super.readNbt(nbt);
        lastHandoffTime = nbt.getLong("lastHandoff");
    }
    
    @Override
    public Packet<ClientPlayPacketListener> toUpdatePacket() {
        return BlockEntityUpdateS2CPacket.create(this);
    }
    
    @Override
    public NbtCompound toInitialChunkDataNbt() {
        return createNbt();
    }
}
