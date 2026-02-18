package com.riftclaw.block;

import com.riftclaw.RiftClawMod;
import com.riftclaw.block.entity.RiftPortalBlockEntity;
import net.minecraft.block.Block;
import net.minecraft.block.BlockEntityProvider;
import net.minecraft.block.BlockState;
import net.minecraft.block.ShapeContext;
import net.minecraft.block.entity.BlockEntity;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.particle.ParticleTypes;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.random.Random;
import net.minecraft.util.shape.VoxelShape;
import net.minecraft.util.shape.VoxelShapes;
import net.minecraft.world.BlockView;
import net.minecraft.world.World;

public class RiftPortalBlock extends Block implements BlockEntityProvider {
    
    protected static final VoxelShape SHAPE = VoxelShapes.cuboid(0.0, 0.0, 0.0, 1.0, 0.875, 1.0);
    
    public RiftPortalBlock(Settings settings) {
        super(settings);
    }
    
    @Override
    public VoxelShape getOutlineShape(BlockState state, BlockView world, BlockPos pos, ShapeContext context) {
        return SHAPE;
    }
    
    @Override
    public BlockEntity createBlockEntity(BlockPos pos, BlockState state) {
        return new RiftPortalBlockEntity(pos, state);
    }
    
    @Override
    public void randomDisplayTick(BlockState state, World world, BlockPos pos, Random random) {
        // Spawn portal particles
        if (random.nextInt(100) < 25) {
            double x = pos.getX() + random.nextDouble();
            double y = pos.getY() + 0.8 + random.nextDouble() * 0.5;
            double z = pos.getZ() + random.nextDouble();
            
            world.addParticle(ParticleTypes.PORTAL, x, y, z, 
                (random.nextDouble() - 0.5) * 0.2, 
                random.nextDouble() * 0.2, 
                (random.nextDouble() - 0.5) * 0.2);
            
            // Cyan particles for RiftClaw style
            world.addParticle(ParticleTypes.DRIPPING_WATER, x, y, z, 0, 0, 0);
        }
    }
    
    @Override
    public void onEntityCollision(BlockState state, World world, BlockPos pos, Entity entity) {
        if (world.isClient) return;
        if (!(entity instanceof PlayerEntity player)) return;
        
        BlockEntity blockEntity = world.getBlockEntity(pos);
        if (blockEntity instanceof RiftPortalBlockEntity riftEntity) {
            // Trigger handoff after delay to prevent spam
            if (riftEntity.canTriggerHandoff()) {
                riftEntity.triggerHandoff(player);
            }
        }
    }
    
    @Override
    public void onSteppedOn(World world, BlockPos pos, BlockState state, Entity entity) {
        if (world.isClient) return;
        if (!(entity instanceof PlayerEntity player)) return;
        
        // Play portal sound
        world.playSound(null, pos, SoundEvents.BLOCK_PORTAL_AMBIENT, 
            SoundCategory.BLOCKS, 0.5f, 1.0f);
    }
}
