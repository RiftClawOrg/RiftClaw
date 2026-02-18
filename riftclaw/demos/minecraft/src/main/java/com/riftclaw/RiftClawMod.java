package com.riftclaw;

import com.riftclaw.block.RiftPortalBlock;
import com.riftclaw.block.entity.RiftPortalBlockEntity;
import com.riftclaw.network.RiftClawNetworking;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.item.v1.FabricItemSettings;
import net.fabricmc.fabric.api.object.builder.v1.block.FabricBlockSettings;
import net.fabricmc.fabric.api.object.builder.v1.block.entity.FabricBlockEntityTypeBuilder;
import net.minecraft.block.Block;
import net.minecraft.block.Blocks;
import net.minecraft.block.entity.BlockEntityType;
import net.minecraft.item.BlockItem;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.sound.BlockSoundGroup;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RiftClawMod implements ModInitializer {
    public static final String MOD_ID = "riftclaw";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);
    
    // Rift Portal Block
    public static final Block RIFT_PORTAL_BLOCK = new RiftPortalBlock(
        FabricBlockSettings.copyOf(Blocks.OBSIDIAN)
            .luminance(15)
            .sounds(BlockSoundGroup.AMETHYST_BLOCK)
    );
    
    public static BlockEntityType<RiftPortalBlockEntity> RIFT_PORTAL_BLOCK_ENTITY;
    
    @Override
    public void onInitialize() {
        LOGGER.info("Initializing RiftClaw Protocol v0.1");
        
        // Register blocks
        Registry.register(Registries.BLOCK, new Identifier(MOD_ID, "rift_portal"), RIFT_PORTAL_BLOCK);
        Registry.register(Registries.ITEM, new Identifier(MOD_ID, "rift_portal"), 
            new BlockItem(RIFT_PORTAL_BLOCK, new FabricItemSettings()));
        
        // Register block entity
        RIFT_PORTAL_BLOCK_ENTITY = Registry.register(
            Registries.BLOCK_ENTITY_TYPE,
            new Identifier(MOD_ID, "rift_portal"),
            FabricBlockEntityTypeBuilder.create(RiftPortalBlockEntity::new, RIFT_PORTAL_BLOCK).build()
        );
        
        // Initialize networking
        RiftClawNetworking.init();
        
        LOGGER.info("RiftClaw ready for cross-server travel!");
    }
}
