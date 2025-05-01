import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { ParticleSystem } from '../../effects/ParticleSystem';

export interface ProjectileStats {
    damage: number;
    knockback: number;
    speed: number;
    lifetime: number;
    color: number;
    maxRange: number;
    size: number;
}

export abstract class Projectile extends Entity {
    protected startPos: { x: number, y: number };
    protected lifetime: number;
    protected distanceTraveled: number = 0;
    protected stats: ProjectileStats;
    protected declare sprite: PIXI.Graphics;
    protected owner: Entity | null = null;  // Store the owner entity reference
    
    constructor(
        x: number, 
        y: number, 
        angle: number, 
        bounds: { width: number; height: number },
        stats: ProjectileStats,
        isEnemy: boolean = false,
        owner: Entity | null = null  // Add owner parameter
    ) {
        super(bounds, 1); // Projectiles have 1 HP
        this.x = x;
        this.y = y;
        this.rotation = angle;
        this.startPos = { x, y };
        this.lifetime = stats.lifetime;
        this.stats = stats;
        this.isEnemy = isEnemy;
        this.owner = owner;  // Store owner reference
        
        // Set velocity based on direction and speed
        this.velocity = {
            x: Math.cos(angle) * stats.speed,
            y: Math.sin(angle) * stats.speed
        };
        
        // Set radius for collision detection
        this.radius = stats.size / 2;
        
        // Initialize sprite - this must happen before drawProjectile is called
        this.sprite = new PIXI.Graphics();
        this.addChild(this.sprite);
        
        // Draw the projectile
        this.drawProjectile();
    }
    
    protected abstract drawProjectile(): void;

    public update(delta: number, targets: Entity[]): void {
        // If we're not alive, don't update
        if (!this.isAlive()) return;

        // Update lifetime - use seconds directly instead of converting delta to ms
        this.lifetime -= delta;
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
            // Gentle slowdown - adjust based on framerate
            const slowdownFactor = Math.pow(0.98, 60 * delta);
            this.velocity.x *= slowdownFactor;
            this.velocity.y *= slowdownFactor;

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
        // Filter targets to exclude:
        // 1. Targets of the same type (enemy vs player)
        // 2. Dead targets
        // 3. The entity that created/owned this projectile
        const eligibleTargets = targets.filter(t => {
            // Exclude targets of the same type (enemy vs player)
            if (t.isEnemy === this.isEnemy) return false;
            
            // Exclude dead targets
            if (!t.isAlive()) return false;
            
            // Exclude the owner of this projectile
            if (t === this.owner) return false;
            
            return true;
        });
        
        for (const target of eligibleTargets) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.radius + target.getRadius()) {
                // Calculate knockback direction
                const knockbackDir = {
                    x: dx / distance,
                    y: dy / distance
                };
                
                // Apply damage and knockback
                target.takeDamage(this.stats.damage, knockbackDir, this.stats.knockback);
                
                // Create hit effect
                ParticleSystem.getInstance().createHitSparks(target.x, target.y, this.stats.color);
                
                // Destroy the projectile
                this.destroy();
                break;
            }
        }
    }

    public destroy(): void {        
        // Set health to 0
        this.health = 0;
        
        // Remove from parent
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    protected applyVelocity(): void {
        // Override Entity's applyVelocity to remove friction for projectiles
        // Scale movement by delta time for framerate independence
        const delta = 1/60; // Use fixed timestep for consistent physics
        this.x += this.velocity.x * delta * 60;
        this.y += this.velocity.y * delta * 60;

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