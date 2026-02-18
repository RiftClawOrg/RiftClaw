/**
 * RiftClaw Item Enhancement Module - Day 6
 * Adds floating animations, pickup prompts, and 3D drop to any world
 * Include this AFTER the existing inventory code in each world
 */

(function() {
    // ============================================
    // ENHANCED ITEM VISUALS
    // ============================================
    
    // Store original spawn function if it exists
    const originalSpawnWorldItems = window.spawnWorldItems;
    
    // Enhanced item geometries with glow
    const itemVisuals = {
        'tech': { geometry: 'icosahedron', color: 0x00ffff, emissive: 0x0088aa, scale: 0.35 },
        'token': { geometry: 'cylinder', color: 0xffd700, emissive: 0xaa8800, scale: 0.3 },
        'material': { geometry: 'dodecahedron', color: 0xff3333, emissive: 0xaa0000, scale: 0.35 },
        'trophy': { geometry: 'cone', color: 0xffaa00, emissive: 0xaa6600, scale: 0.4 },
        'key': { geometry: 'torus', color: 0xc0c0c0, emissive: 0x888888, scale: 0.25 },
        'crystal': { geometry: 'octahedron', color: 0x00ffff, emissive: 0x0088aa, scale: 0.4 },
        'gem': { geometry: 'icosahedron', color: 0xff00ff, emissive: 0xaa00aa, scale: 0.35 },
        'potion': { geometry: 'cone', color: 0x00ff00, emissive: 0x00aa00, scale: 0.3 },
        'fragment': { geometry: 'tetrahedron', color: 0xff3333, emissive: 0xaa0000, scale: 0.35 },
        'coin': { geometry: 'cylinder', color: 0xffd700, emissive: 0xaa8800, scale: 0.3 }
    };
    
    function createEnhancedGeometry(type) {
        const visual = itemVisuals[type] || itemVisuals['crystal'];
        const s = visual.scale;
        
        switch(visual.geometry) {
            case 'icosahedron': return new THREE.IcosahedronGeometry(s, 0);
            case 'cylinder': return new THREE.CylinderGeometry(s, s, 0.05, 16);
            case 'dodecahedron': return new THREE.DodecahedronGeometry(s, 0);
            case 'cone': return new THREE.ConeGeometry(s * 0.8, s * 1.5, 8);
            case 'torus': return new THREE.TorusGeometry(s, s * 0.4, 8, 16);
            case 'octahedron': return new THREE.OctahedronGeometry(s, 0);
            case 'tetrahedron': return new THREE.TetrahedronGeometry(s, 0);
            default: return new THREE.BoxGeometry(s, s, s);
        }
    }
    
    function createGlowMesh(geometry, color) {
        const glowGeo = geometry.clone();
        const glowMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.scale.set(1.4, 1.4, 1.4);
        return glow;
    }
    
    // ============================================
    // FLOATING ANIMATION SYSTEM
    // ============================================
    
    window.enhancedItemMeshes = window.enhancedItemMeshes || [];
    
    window.spawnEnhancedItems = function(scene) {
        if (typeof worldItems === 'undefined' || !worldItems[window.currentWorld]) return;
        
        worldItems[window.currentWorld].forEach(item => {
            if (item.collected) return;
            
            const visual = itemVisuals[item.type] || itemVisuals['crystal'];
            const geometry = createEnhancedGeometry(item.type);
            const material = new THREE.MeshPhongMaterial({
                color: visual.color,
                emissive: visual.emissive,
                emissiveIntensity: 0.3,
                shininess: 100
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(item.x, 1.5, item.z);
            mesh.userData = { 
                itemId: item.id, 
                itemData: item,
                originalY: 1.5,
                floatOffset: Math.random() * Math.PI * 2,
                rotationSpeed: 0.5 + Math.random() * 0.5
            };
            
            // Add glow
            const glow = createGlowMesh(geometry, visual.color);
            mesh.add(glow);
            
            // Add ring indicator
            const ringGeo = new THREE.RingGeometry(0.5, 0.6, 16);
            const ringMat = new THREE.MeshBasicMaterial({ 
                color: visual.color, 
                side: THREE.DoubleSide, 
                transparent: true, 
                opacity: 0.3 
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = -0.5;
            mesh.add(ring);
            
            scene.add(mesh);
            window.enhancedItemMeshes.push(mesh);
        });
    };
    
    window.animateEnhancedItems = function(time) {
        window.enhancedItemMeshes.forEach(mesh => {
            if (!mesh.parent) return;
            
            const data = mesh.userData;
            // Float up and down
            mesh.position.y = data.originalY + Math.sin(time * 2 + data.floatOffset) * 0.2;
            // Rotate
            mesh.rotation.y += 0.02 * data.rotationSpeed;
            mesh.rotation.x = Math.sin(time + data.floatOffset) * 0.1;
        });
    };
    
    // ============================================
    // PICKUP PROMPT UI
    // ============================================
    
    function createPickupPrompt() {
        if (document.getElementById('pickup-prompt')) return;
        
        const prompt = document.createElement('div');
        prompt.id = 'pickup-prompt';
        prompt.style.cssText = `
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #ffd700;
            border-radius: 12px;
            padding: 15px 25px;
            color: #ffd700;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 1.1rem;
            z-index: 999;
            display: none;
            text-align: center;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            animation: pickupPulse 1.5s ease-in-out infinite;
        `;
        prompt.innerHTML = `
            <div id="pickup-icon" style="font-size: 2.5rem; margin-bottom: 8px; animation: itemBounce 0.5s ease-in-out infinite alternate;">📦</div>
            <div id="pickup-name" style="font-weight: bold; margin-bottom: 5px;">Item Name</div>
            <div style="font-size: 0.9rem; color: #aaa;">Press <kbd style="background: #333; padding: 2px 8px; border-radius: 4px;">E</kbd> to collect</div>
        `;
        document.body.appendChild(prompt);
        
        // Add animations
        if (!document.getElementById('pickup-animations')) {
            const style = document.createElement('style');
            style.id = 'pickup-animations';
            style.textContent = `
                @keyframes pickupPulse {
                    0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                    50% { opacity: 0.9; transform: translateX(-50%) scale(1.02); }
                }
                @keyframes itemBounce {
                    from { transform: translateY(0); }
                    to { transform: translateY(-5px); }
                }
                @keyframes floatUpText {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
                }
                .collected-text {
                    position: fixed;
                    pointer-events: none;
                    animation: floatUpText 1s ease-out forwards;
                    font-size: 1.3rem;
                    font-weight: bold;
                    z-index: 2000;
                    text-shadow: 0 0 10px currentColor;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    window.checkEnhancedPickups = function(playerPos) {
        createPickupPrompt();
        const prompt = document.getElementById('pickup-prompt');
        const iconEl = document.getElementById('pickup-icon');
        const nameEl = document.getElementById('pickup-name');
        
        let closestItem = null;
        let closestDistance = Infinity;
        
        window.enhancedItemMeshes.forEach(mesh => {
            if (!mesh.parent) return;
            const distance = playerPos.distanceTo(mesh.position);
            if (distance < 2.5 && distance < closestDistance) {
                closestDistance = distance;
                closestItem = mesh;
            }
        });
        
        if (closestItem) {
            prompt.style.display = 'block';
            iconEl.textContent = closestItem.userData.itemData.icon;
            nameEl.textContent = closestItem.userData.itemData.name;
            window.nearbyItem = closestItem;
        } else {
            prompt.style.display = 'none';
            window.nearbyItem = null;
        }
        
        return closestItem;
    };
    
    window.showCollectedEffect = function(item, position) {
        // Floating text effect
        const text = document.createElement('div');
        text.className = 'collected-text';
        text.textContent = `${item.icon} +${item.quantity || 1} ${item.name}`;
        text.style.left = '50%';
        text.style.top = '40%';
        text.style.color = '#00ff00';
        document.body.appendChild(text);
        setTimeout(() => text.remove(), 1000);
        
        // Particle burst effect (simplified)
        if (window.scene && position) {
            for (let i = 0; i < 8; i++) {
                const particle = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({ color: 0xffff00 })
                );
                particle.position.copy(position);
                particle.position.x += (Math.random() - 0.5) * 0.5;
                particle.position.y += (Math.random() - 0.5) * 0.5;
                particle.position.z += (Math.random() - 0.5) * 0.5;
                window.scene.add(particle);
                
                // Animate and remove
                const speed = {
                    x: (Math.random() - 0.5) * 0.1,
                    y: Math.random() * 0.1,
                    z: (Math.random() - 0.5) * 0.1
                };
                
                let frame = 0;
                function animateParticle() {
                    if (frame > 30) {
                        window.scene.remove(particle);
                        return;
                    }
                    particle.position.x += speed.x;
                    particle.position.y += speed.y;
                    particle.position.z += speed.z;
                    particle.rotation.x += 0.2;
                    particle.rotation.y += 0.2;
                    particle.scale.multiplyScalar(0.9);
                    frame++;
                    requestAnimationFrame(animateParticle);
                }
                animateParticle();
            }
        }
    };
    
    // ============================================
    // 3D DROP FUNCTIONALITY
    // ============================================
    
    window.dropItemInWorld = function(itemData, position) {
        const worldName = window.currentWorld || 'unknown';
        
        // Create dropped item
        const dropItem = {
            id: 'dropped_' + Date.now(),
            name: itemData.name,
            type: itemData.type,
            icon: itemData.icon,
            quantity: itemData.quantity || 1,
            world: worldName,
            x: position.x,
            z: position.z,
            collected: false
        };
        
        // Add to world items
        if (!worldItems[worldName]) worldItems[worldName] = [];
        worldItems[worldName].push(dropItem);
        
        // Spawn in 3D
        const visual = itemVisuals[item.type] || itemVisuals['crystal'];
        const geometry = createEnhancedGeometry(item.type);
        const material = new THREE.MeshPhongMaterial({
            color: visual.color,
            emissive: visual.emissive,
            emissiveIntensity: 0.3,
            shininess: 100
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y + 0.5, position.z);
        mesh.userData = { 
            itemId: dropItem.id, 
            itemData: dropItem,
            originalY: position.y + 0.5,
            floatOffset: Math.random() * Math.PI * 2,
            rotationSpeed: 0.5
        };
        
        // Add glow
        mesh.add(createGlowMesh(geometry, visual.color));
        
        // Add ring
        const ringGeo = new THREE.RingGeometry(0.5, 0.6, 16);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: visual.color, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.3 
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.5;
        mesh.add(ring);
        
        window.scene.add(mesh);
        window.enhancedItemMeshes.push(mesh);
        
        // Save
        localStorage.setItem('riftclaw_world_items', JSON.stringify(worldItems));
        
        // Show effect
        const text = document.createElement('div');
        text.className = 'collected-text';
        text.textContent = `Dropped ${itemData.icon} ${itemData.name}`;
        text.style.left = '50%';
        text.style.top = '50%';
        text.style.color = '#ffaa00';
        document.body.appendChild(text);
        setTimeout(() => text.remove(), 1000);
    };
    
    // ============================================
    // KEYBOARD HANDLER
    // ============================================
    
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'e' && window.nearbyItem) {
            const item = window.nearbyItem.userData.itemData;
            if (typeof inventory !== 'undefined' && inventory.add(item)) {
                // Mark as collected
                item.collected = true;
                localStorage.setItem('riftclaw_world_items', JSON.stringify(worldItems));
                
                // Remove mesh
                const idx = window.enhancedItemMeshes.indexOf(window.nearbyItem);
                if (idx > -1) window.enhancedItemMeshes.splice(idx, 1);
                if (window.scene) window.scene.remove(window.nearbyItem);
                
                // Show effect
                window.showCollectedEffect(item, window.nearbyItem.position);
                
                // Hide prompt
                const prompt = document.getElementById('pickup-prompt');
                if (prompt) prompt.style.display = 'none';
                window.nearbyItem = null;
            }
        }
    });
    
    // Override inventory drop to use 3D
    if (typeof inventory !== 'undefined' && inventory.dropByName) {
        const originalDrop = inventory.dropByName.bind(inventory);
        inventory.dropByName = function(itemName) {
            const idx = this.items.findIndex(i => i.name === itemName);
            if (idx >= 0) {
                const item = this.items[idx];
                
                // Get player position for drop location
                let dropPos = { x: 0, y: 1, z: 0 };
                if (window.agentMesh) {
                    dropPos = {
                        x: window.agentMesh.position.x + (Math.random() - 0.5) * 2,
                        y: 1,
                        z: window.agentMesh.position.z + (Math.random() - 0.5) * 2
                    };
                }
                
                // Drop in 3D world
                window.dropItemInWorld(item, dropPos);
                
                // Remove from inventory
                this.items.splice(idx, 1);
                this.save();
                this.updateUI();
            }
        };
    }
    
    console.log('🎒 RiftClaw Item Enhancement Module loaded');
})();
