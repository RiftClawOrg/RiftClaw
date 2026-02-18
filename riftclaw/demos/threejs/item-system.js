/**
 * RiftClaw Item System - Day 6 Build
 * Collectible items with pickup/drop functionality
 */

// ============================================
// ITEM CLASS - Represents a collectible item
// ============================================
class Item {
    constructor(id, name, type, icon, quantity, world) {
        this.id = id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
        this.name = name;
        this.type = type; // 'crystal', 'coin', 'gem', 'key', 'fragment', 'potion'
        this.icon = icon;
        this.quantity = quantity || 1;
        this.world = world;
        this.mesh = null;
        this.originalY = 0;
        this.floatOffset = Math.random() * Math.PI * 2;
    }
    
    createMesh(scene, x, y, z) {
        this.originalY = y;
        
        // Geometry based on type
        let geometry, material, color, emissive;
        
        switch(this.type) {
            case 'crystal':
                geometry = new THREE.OctahedronGeometry(0.4, 0);
                color = 0x00ffff;
                emissive = 0x0088aa;
                break;
            case 'coin':
                geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
                color = 0xffd700;
                emissive = 0xaa8800;
                break;
            case 'gem':
                geometry = new THREE.IcosahedronGeometry(0.35, 0);
                color = 0xff00ff;
                emissive = 0xaa00aa;
                break;
            case 'key':
                geometry = new THREE.BoxGeometry(0.5, 0.2, 0.1);
                color = 0xc0c0c0;
                emissive = 0x888888;
                break;
            case 'fragment':
                geometry = new THREE.TetrahedronGeometry(0.35, 0);
                color = 0xff3333;
                emissive = 0xaa0000;
                break;
            case 'potion':
                geometry = new THREE.ConeGeometry(0.25, 0.5, 8);
                color = 0x00ff00;
                emissive = 0x00aa00;
                break;
            default:
                geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                color = 0xffffff;
                emissive = 0x888888;
        }
        
        material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: emissive,
            emissiveIntensity: 0.3,
            shininess: 100
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.userData = { item: this };
        
        // Add glow effect
        const glowGeometry = geometry.clone();
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.scale.set(1.3, 1.3, 1.3);
        this.mesh.add(glowMesh);
        
        scene.add(this.mesh);
        return this.mesh;
    }
    
    checkProximity(playerPosition) {
        if (!this.mesh) return Infinity;
        return this.mesh.position.distanceTo(playerPosition);
    }
    
    animate(time) {
        if (!this.mesh) return;
        
        // Float up and down
        this.mesh.position.y = this.originalY + Math.sin(time * 2 + this.floatOffset) * 0.2;
        
        // Rotate
        this.mesh.rotation.y += 0.02;
        this.mesh.rotation.x = Math.sin(time + this.floatOffset) * 0.1;
    }
    
    dispose(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}

// ============================================
// ITEM MANAGER - Handles spawning and pickups
// ============================================
class ItemManager {
    constructor(scene, inventory) {
        this.scene = scene;
        this.inventory = inventory;
        this.items = [];
        this.pickupDistance = 2.5;
        this.nearbyItem = null;
        
        // Item definitions per world
        this.worldItems = {
            'lobby': [
                { name: 'Portal Shard', type: 'crystal', icon: '💎' },
                { name: 'Data Crystal', type: 'gem', icon: '💾' }
            ],
            'arena': [
                { name: 'Combat Coin', type: 'coin', icon: '🪙' },
                { name: 'Warrior Fragment', type: 'fragment', icon: '⚔️' },
                { name: 'Health Potion', type: 'potion', icon: '🧪' }
            ],
            'forest': [
                { name: 'Nature Gem', type: 'gem', icon: '🌿' },
                { name: 'Ancient Key', type: 'key', icon: '🗝️' },
                { name: 'Forest Crystal', type: 'crystal', icon: '💚' }
            ],
            'space': [
                { name: 'Star Fragment', type: 'fragment', icon: '⭐' },
                { name: 'Void Crystal', type: 'crystal', icon: '🌑' },
                { name: 'Cosmic Coin', type: 'coin', icon: '🪐' }
            ],
            'moon': [
                { name: 'Lunar Shard', type: 'crystal', icon: '🌙' },
                { name: 'Moon Rock', type: 'gem', icon: '🪨' }
            ],
            'water': [
                { name: 'Pearl', type: 'gem', icon: '🦪' },
                { name: 'Coral Crystal', type: 'crystal', icon: '🪸' },
                { name: 'Aqua Key', type: 'key', icon: '🔱' }
            ],
            'cyb3r': [
                { name: 'Data Fragment', type: 'fragment', icon: '💿' },
                { name: 'Crypto Coin', type: 'coin', icon: '₿' },
                { name: 'Access Key', type: 'key', icon: '🔐' }
            ]
        };
    }
    
    spawnItem(name, type, icon, x, y, z, world, quantity) {
        const item = new Item(null, name, type, icon, quantity, world);
        item.createMesh(this.scene, x, y, z);
        this.items.push(item);
        return item;
    }
    
    spawnWorldItems(worldName, count) {
        const definitions = this.worldItems[worldName] || this.worldItems['lobby'];
        const spawned = [];
        
        for (let i = 0; i < count; i++) {
            const def = definitions[Math.floor(Math.random() * definitions.length)];
            const x = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            const y = 1 + Math.random() * 0.5;
            
            // Don't spawn too close to center (portal area)
            if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;
            
            const item = this.spawnItem(
                def.name,
                def.type,
                def.icon,
                x, y, z,
                worldName,
                Math.floor(Math.random() * 3) + 1
            );
            spawned.push(item);
        }
        
        return spawned;
    }
    
    checkPickups(playerPosition) {
        this.nearbyItem = null;
        let closestDistance = Infinity;
        
        for (const item of this.items) {
            const distance = item.checkProximity(playerPosition);
            if (distance < this.pickupDistance && distance < closestDistance) {
                closestDistance = distance;
                this.nearbyItem = item;
            }
        }
        
        return this.nearbyItem;
    }
    
    pickupItem(item) {
        if (!item) return false;
        
        const success = this.inventory.add({
            id: item.id,
            name: item.name,
            type: item.type,
            icon: item.icon,
            quantity: item.quantity,
            world: item.world
        });
        
        if (success) {
            this.removeItem(item);
            return true;
        }
        return false;
    }
    
    removeItem(item) {
        const index = this.items.indexOf(item);
        if (index > -1) {
            item.dispose(this.scene);
            this.items.splice(index, 1);
        }
    }
    
    dropItem(itemData, position) {
        const item = this.spawnItem(
            itemData.name,
            itemData.type,
            itemData.icon,
            position.x,
            position.y,
            position.z,
            itemData.world,
            itemData.quantity
        );
        
        // Add a little upward velocity effect
        item.originalY = position.y + 0.5;
        
        return item;
    }
    
    animate(time) {
        for (const item of this.items) {
            item.animate(time);
        }
    }
    
    clear() {
        for (const item of this.items) {
            item.dispose(this.scene);
        }
        this.items = [];
    }
}
