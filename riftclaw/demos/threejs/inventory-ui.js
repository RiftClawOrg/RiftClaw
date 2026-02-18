/**
 * RiftClaw Inventory UI Module - Shared across all worlds
 * Provides inventory display, pickup prompts, and drop functionality
 */

// ============================================
// INVENTORY UI CONTROLLER
// ============================================
class InventoryUI {
    constructor(inventory, options = {}) {
        this.inventory = inventory;
        this.visible = false;
        this.onDropCallback = options.onDrop || null;
        this.worldName = options.worldName || 'world';
        
        this.createUI();
        this.setupKeyboardHandlers();
    }
    
    createUI() {
        // Create inventory panel if it doesn't exist
        if (!document.getElementById('inventory-panel')) {
            const panel = document.createElement('div');
            panel.id = 'inventory-panel';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #00d5ff;
                border-radius: 12px;
                padding: 20px;
                min-width: 300px;
                max-width: 400px;
                color: #00d5ff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                z-index: 1000;
                display: none;
                box-shadow: 0 0 30px rgba(0, 213, 255, 0.3);
            `;
            panel.innerHTML = `
                <h3 style="margin: 0 0 15px 0; text-align: center; font-size: 1.3rem;">
                    🎒 Inventory (<span id="inv-count">0</span>/8)
                </h3>
                <div id="inv-slots" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px;">
                </div>
                <div style="font-size: 0.8rem; color: #888; text-align: center; border-top: 1px solid #333; padding-top: 10px;">
                    <span style="color: #ff3333;">Click item</span> to drop • <kbd>I</kbd> to close
                </div>
            `;
            document.body.appendChild(panel);
        }
        
        // Create pickup prompt
        if (!document.getElementById('pickup-prompt')) {
            const prompt = document.createElement('div');
            prompt.id = 'pickup-prompt';
            prompt.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid #ffd700;
                border-radius: 8px;
                padding: 15px 25px;
                color: #ffd700;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 1rem;
                z-index: 999;
                display: none;
                text-align: center;
                animation: pulse 1s infinite;
            `;
            prompt.innerHTML = `
                <div id="pickup-icon" style="font-size: 2rem; margin-bottom: 5px;">📦</div>
                <div id="pickup-text">Press <kbd>E</kbd> to collect</div>
            `;
            document.body.appendChild(prompt);
        }
        
        // Add animation keyframes
        if (!document.getElementById('inv-animations')) {
            const style = document.createElement('style');
            style.id = 'inv-animations';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                    50% { opacity: 0.8; transform: translateX(-50%) scale(1.05); }
                }
                @keyframes floatUp {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(-30px); opacity: 0; }
                }
                .item-float {
                    position: fixed;
                    pointer-events: none;
                    animation: floatUp 1s ease-out forwards;
                    font-size: 1.5rem;
                    z-index: 2000;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'i') {
                this.toggle();
            }
            if (e.key.toLowerCase() === 'e' && this.visible) {
                // E closes inventory too for consistency
                this.hide();
            }
        });
    }
    
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    show() {
        this.visible = true;
        const panel = document.getElementById('inventory-panel');
        if (panel) {
            panel.style.display = 'block';
            this.refresh();
        }
    }
    
    hide() {
        this.visible = false;
        const panel = document.getElementById('inventory-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }
    
    refresh() {
        const slotsContainer = document.getElementById('inv-slots');
        const countEl = document.getElementById('inv-count');
        if (!slotsContainer) return;
        
        const items = this.inventory.get ? this.inventory.get() : this.inventory.items || [];
        
        if (countEl) {
            countEl.textContent = items.length;
        }
        
        slotsContainer.innerHTML = '';
        
        // Create slots
        for (let i = 0; i < 8; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 60px;
                height: 60px;
                background: rgba(0, 213, 255, 0.1);
                border: 1px solid rgba(0, 213, 255, 0.3);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.8rem;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            `;
            
            if (i < items.length) {
                const item = items[i];
                slot.innerHTML = `${item.icon}<span style="position: absolute; bottom: 2px; right: 4px; font-size: 0.7rem; color: #fff;">${item.quantity}</span>`;
                slot.title = `${item.name} (${item.type})\nWorld: ${item.world}\nClick to drop`;
                slot.style.background = 'rgba(0, 213, 255, 0.2)';
                slot.style.borderColor = '#00d5ff';
                
                slot.addEventListener('click', () => this.dropItem(i));
                slot.addEventListener('mouseenter', () => {
                    slot.style.background = 'rgba(0, 213, 255, 0.3)';
                    slot.style.transform = 'scale(1.1)';
                });
                slot.addEventListener('mouseleave', () => {
                    slot.style.background = 'rgba(0, 213, 255, 0.2)';
                    slot.style.transform = 'scale(1)';
                });
            } else {
                slot.innerHTML = '<span style="color: #333; font-size: 1rem;">Empty</span>';
            }
            
            slotsContainer.appendChild(slot);
        }
    }
    
    dropItem(index) {
        const items = this.inventory.get ? this.inventory.get() : this.inventory.items || [];
        if (index >= items.length) return;
        
        const item = items[index];
        
        // Remove from inventory
        if (this.inventory.remove) {
            this.inventory.remove(item.id);
        } else {
            items.splice(index, 1);
        }
        
        // Callback for 3D drop
        if (this.onDropCallback) {
            this.onDropCallback(item);
        }
        
        // Show floating text
        this.showFloatText(`Dropped ${item.name}`, item.icon);
        
        // Refresh UI
        this.refresh();
    }
    
    showFloatText(text, icon) {
        const floatEl = document.createElement('div');
        floatEl.className = 'item-float';
        floatEl.style.left = '50%';
        floatEl.style.top = '50%';
        floatEl.innerHTML = `${icon} ${text}`;
        document.body.appendChild(floatEl);
        
        setTimeout(() => floatEl.remove(), 1000);
    }
    
    showPickupPrompt(item) {
        const prompt = document.getElementById('pickup-prompt');
        const iconEl = document.getElementById('pickup-icon');
        const textEl = document.getElementById('pickup-text');
        
        if (prompt && item) {
            prompt.style.display = 'block';
            if (iconEl) iconEl.textContent = item.icon;
            if (textEl) textEl.innerHTML = `<strong>${item.name}</strong><br>Press <kbd>E</kbd> to collect`;
        }
    }
    
    hidePickupPrompt() {
        const prompt = document.getElementById('pickup-prompt');
        if (prompt) {
            prompt.style.display = 'none';
        }
    }
    
    showCollectedMessage(item) {
        this.showFloatText(`+${item.quantity} ${item.name}`, item.icon);
    }
}

// ============================================
// INTEGRATION HELPER
// ============================================
function setupItemSystem(scene, inventory, worldName, playerPosition) {
    // Load item system script if not already loaded
    if (typeof ItemManager === 'undefined') {
        const script = document.createElement('script');
        script.src = 'item-system.js';
        document.head.appendChild(script);
    }
    
    // Create item manager
    const itemManager = new ItemManager(scene, inventory);
    
    // Create inventory UI
    const inventoryUI = new InventoryUI(inventory, {
        worldName: worldName,
        onDrop: (item) => {
            // Drop item at player position
            const dropPos = playerPosition.clone();
            dropPos.y += 0.5;
            itemManager.dropItem(item, dropPos);
        }
    });
    
    // Spawn world items
    const itemCount = 5 + Math.floor(Math.random() * 5); // 5-10 items
    itemManager.spawnWorldItems(worldName, itemCount);
    
    // Setup pickup key handler
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'e') {
            const nearby = itemManager.checkPickups(playerPosition);
            if (nearby) {
                if (itemManager.pickupItem(nearby)) {
                    inventoryUI.showCollectedMessage(nearby);
                }
            }
        }
    });
    
    // Return objects for animation loop
    return { itemManager, inventoryUI };
}
