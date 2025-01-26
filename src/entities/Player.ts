import * as PIXI from 'pixi.js';
import { Entity } from './Entity';
import { BasicSword } from './weapons/BasicSword';
import { BaseEnemy } from './enemies/BaseEnemy';

export class Player extends Entity {
    private sprite: PIXI.Graphics;
    private speed: number = 2.5;
    private dashSpeed: number = 10;
    private dashDirection: { dx: number, dy: number } | null = null;
    private sword: BasicSword;

    constructor(screenBounds: { width: number; height: number }) {
        super(screenBounds, 100); // 100 health points
        
        // Create a simple player sprite (blue triangle for directional visibility)
        this.sprite = new PIXI.Graphics();
        this.drawSprite();
        this.addChild(this.sprite);

        // Add sword
        this.sword = new BasicSword(this, false);
        this.addChild(this.sword);
    }

    private drawSprite(): void {
        this.sprite.clear();
        this.sprite.beginFill(0x3498db);
        this.sprite.moveTo(-10, -10);
        this.sprite.lineTo(10, 0);
        this.sprite.lineTo(-10, 10);
        this.sprite.lineTo(-10, -10);
        this.sprite.endFill();
    }

    public reset(): void {
        this.health = this.maxHealth;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.dashDirection = null;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public update(delta: number, keys: Set<string>, mouseX: number, mouseY: number, isDashing: boolean, enemies: BaseEnemy[], isAttacking: boolean): void {
        if (!this.isAlive()) return;

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
        this.velocity.x = dx * currentSpeed;
        this.velocity.y = dy * currentSpeed;

        // Apply velocity and knockback
        this.applyVelocity();

        // Update rotation to face mouse
        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        this.rotation = angle;

        // Handle sword
        if (isAttacking) {
            this.sword.swing();
        }
        this.sword.update(delta, enemies);
    }
} 