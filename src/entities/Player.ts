import * as PIXI from 'pixi.js';

export class Player extends PIXI.Container {
    private sprite: PIXI.Graphics;
    private speed: number = 5;
    private bounds: { width: number; height: number };

    constructor(screenBounds: { width: number; height: number }) {
        super();
        
        this.bounds = screenBounds;
        
        // Create a simple player sprite (blue rectangle for now)
        this.sprite = new PIXI.Graphics();
        this.sprite.beginFill(0x3498db);
        this.sprite.drawRect(-20, -20, 40, 40);
        this.sprite.endFill();
        
        this.addChild(this.sprite);
    }

    public update(keys: Set<string>): void {
        // Calculate movement vector
        let dx = 0;
        let dy = 0;

        if (keys.has('KeyW')) dy -= 1;
        if (keys.has('KeyS')) dy += 1;
        if (keys.has('KeyA')) dx -= 1;
        if (keys.has('KeyD')) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = dx / length;
            dy = dy / length;
        }

        // Apply movement
        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // Clamp position to screen bounds
        const halfWidth = 20; // Half of the player's width
        const halfHeight = 20; // Half of the player's height
        this.x = Math.max(halfWidth, Math.min(this.bounds.width - halfWidth, this.x));
        this.y = Math.max(halfHeight, Math.min(this.bounds.height - halfHeight, this.y));
    }
} 