import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';

export interface ProjectileStats {
    speed: number;
    damage: number;
    knockback: number;
    size: number;
    color: number;
    lifetime: number; // How long the projectile lives before despawning
    maxRange: number; // Maximum distance the projectile can travel
}

export abstract class Projectile extends Entity {
    protected sprite: PIXI.Graphics;
    protected stats: ProjectileStats;
    protected direction: { x: number, y: number };
    protected owner: Entity;
    protected lifetime: number;
    protected distanceTraveled: number = 0;
    protected startPos: { x: number, y: number };

    constructor(
        bounds: { width: number; height: number },
        owner: Entity,
        stats: ProjectileStats,
        startPos: { x: number, y: number },
        direction: { x: number, y: number }
    ) {
        super(bounds, 1); // Health is 1 so projectiles can be destroyed in one hit
        this.owner = owner;
        this.stats = stats;
        this.direction = direction;
        this.lifetime = stats.lifetime;
        this.radius = stats.size; // Use projectile size as collision radius
        this.startPos = { x: startPos.x, y: startPos.y };
        
        // Set initial position
        this.x = startPos.x;
        this.y = startPos.y;

        // Set initial velocity based on direction and speed
        this.velocity.x = direction.x * stats.speed;
        this.velocity.y = direction.y * stats.speed;

        // Create sprite
        this.sprite = new PIXI.Graphics();
        this.drawProjectile();
        this.addChild(this.sprite);

        // Set rotation to match direction
        this.rotation = Math.atan2(direction.y, direction.x);
    }

    protected abstract drawProjectile(): void;

    public update(delta: number, targets: Entity[]): void {
        // If we're not alive, don't update
        if (!this.isAlive()) return;

        // Update lifetime
        this.lifetime -= delta * 16.67; // Convert to milliseconds
        if (this.lifetime <= 0) {
            this.destroy();
            return;
        }

        // Calculate distance from start position
        const dx = this.x - this.startPos.x;
        const dy = this.y - this.startPos.y;
        this.distanceTraveled = Math.sqrt(dx * dx + dy * dy);

        // Start slowing down after max range
        if (this.distanceTraveled > this.stats.maxRange) {
            // Gentle slowdown - reduce speed by 2% per update
            this.velocity.x *= 0.98;
            this.velocity.y *= 0.98;

            // Destroy when speed becomes very low
            const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (currentSpeed < 0.5) {
                this.destroy();
                return;
            }
        }

        // Move projectile
        this.applyVelocity();

        // Check for hits only if we have valid targets
        if (targets && targets.length > 0) {
            this.checkHits(targets);
        }
    }

    protected checkHits(targets: Entity[]): void {
        for (const target of targets) {
            // Skip if target is the owner (if owner still exists), is dead, or was already hit
            if ((this.owner?.isAlive() && target === this.owner) || !target.isAlive()) continue;

            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Simple circle collision
            if (distance < this.stats.size + target.getRadius()) {
                const knockbackDir = {
                    x: this.direction.x,
                    y: this.direction.y
                };
                
                target.takeDamage(this.stats.damage, knockbackDir, this.stats.knockback);
                this.destroy();
                break;
            }
        }
    }

    public takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number): void {
        super.takeDamage(amount, knockbackDir, knockbackForce);
        // When a projectile takes any damage, it's destroyed
        this.destroy();
    }

    public destroy(): void {
        this.health = 0;
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    protected applyVelocity(): void {
        // Override Entity's applyVelocity to remove friction for projectiles
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Keep within bounds
        this.x = Math.max(this.radius, Math.min(this.bounds.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(this.bounds.height - this.radius, this.y));

        // Destroy if hitting bounds
        if (this.x <= this.radius || this.x >= this.bounds.width - this.radius ||
            this.y <= this.radius || this.y >= this.bounds.height - this.radius) {
            this.destroy();
        }
    }
} 