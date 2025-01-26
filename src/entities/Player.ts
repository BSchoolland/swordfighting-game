import * as PIXI from 'pixi.js';

export class Player extends PIXI.Container {
    private sprite: PIXI.Graphics;
    private speed: number = 2.5;
    private dashSpeed: number = 10;
    private bounds: { width: number; height: number };
    private dashDirection: { dx: number, dy: number } | null = null;

    constructor(screenBounds: { width: number; height: number }) {
        super();
        
        this.bounds = screenBounds;
        
        // Create a simple player sprite (blue triangle for directional visibility)
        this.sprite = new PIXI.Graphics();
        this.sprite.beginFill(0x3498db);
        this.sprite.moveTo(-10, -10);
        this.sprite.lineTo(10, 0);
        this.sprite.lineTo(-10, 10);
        this.sprite.lineTo(-10, -10);
        this.sprite.endFill();
        
        this.addChild(this.sprite);
    }

    public update(keys: Set<string>, mouseX: number, mouseY: number, isDashing: boolean): void {
        // Calculate movement vector
        let dx = 0;
        let dy = 0;

        // If we're dashing, use the stored dash direction
        if (isDashing && this.dashDirection) {
            dx = this.dashDirection.dx;
            dy = this.dashDirection.dy;
        } else {
            // Not dashing, calculate new direction from input
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

            // Store direction if we're starting a dash
            if (isDashing && (dx !== 0 || dy !== 0)) {
                this.dashDirection = { dx, dy };
            }
        }

        // Clear dash direction when dash ends
        if (!isDashing) {
            this.dashDirection = null;
        }

        // Apply movement
        const currentSpeed = isDashing ? this.dashSpeed : this.speed;
        this.x += dx * currentSpeed;
        this.y += dy * currentSpeed;

        // Clamp position to screen bounds
        const halfWidth = 10;
        const halfHeight = 10;
        this.x = Math.max(halfWidth, Math.min(this.bounds.width - halfWidth, this.x));
        this.y = Math.max(halfHeight, Math.min(this.bounds.height - halfHeight, this.y));

        // Update rotation to face mouse
        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        this.rotation = angle;
    }
} 