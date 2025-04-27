import { Entity } from '../Entity';
import { Projectile, ProjectileStats } from './Projectile';

export class BoomerangProjectile extends Projectile {
    private rotationSpeed: number = 0.2;
    private isReturning: boolean = false;
    private initialDirection: { x: number, y: number };
    private curveDirection: number = 1; // 1 for right curve, -1 for left curve

    constructor(
        bounds: { width: number; height: number },
        owner: Entity,
        startPos: { x: number, y: number },
        direction: { x: number, y: number },
        stats: ProjectileStats,
    ) {
        super(bounds, owner, stats, startPos, direction);
        this.initialDirection = { ...direction };
        
        // Randomly choose initial curve direction
        this.curveDirection = Math.random() < 0.5 ? 1 : -1;
        console.log('[BoomerangProjectile] Initial curve: ' + (this.curveDirection > 0 ? 'right' : 'left'));
    }

    protected drawProjectile(): void {
        this.sprite.clear();
        
        // Draw boomerang shape
        this.sprite.beginFill(this.stats.color);
        
        // Draw the L shape of the boomerang
        this.sprite.moveTo(-this.stats.size/2, -this.stats.size/2);
        this.sprite.lineTo(this.stats.size/2, -this.stats.size/2);
        this.sprite.lineTo(this.stats.size/2, this.stats.size/2);
        this.sprite.lineTo(this.stats.size/4, this.stats.size/2);
        this.sprite.lineTo(this.stats.size/4, -this.stats.size/4);
        this.sprite.lineTo(-this.stats.size/2, -this.stats.size/4);
        this.sprite.lineTo(-this.stats.size/2, -this.stats.size/2);
        this.sprite.endFill();
    }

    public update(delta: number, targets: Entity[]): void {
        if (!this.isAlive()) return;

        // Call parent update to handle lifetime and distance calculation
        super.update(delta, targets);

        // Rotate the boomerang
        this.rotation += this.rotationSpeed;

        // Check if we should start returning
        if (!this.isReturning && this.distanceTraveled >= this.stats.maxRange) {
            this.isReturning = true;
        }

        if (this.isReturning && this.owner.isAlive()) {
            // Calculate direction to owner
            const dx = this.owner.x - this.x;
            const dy = this.owner.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If very close to owner, destroy the boomerang
            if (distance < 20) {
                this.destroy();
                return;
            }

            // Calculate base return velocity
            const dirToOwner = {
                x: dx / distance,
                y: dy / distance
            };

            // Add perpendicular component for curve
            // The perpendicular vector is (-dy, dx) for right curve or (dy, -dx) for left curve
            const curveStrength = Math.min(1.0, this.stats.maxRange / (distance + 1)) * this.stats.speed;
            const perpComponent = {
                x: -dirToOwner.y * this.curveDirection * curveStrength,
                y: dirToOwner.x * this.curveDirection * curveStrength
            };

            // Combine direct and perpendicular components
            this.velocity.x = dirToOwner.x * this.stats.speed * 0.8 + perpComponent.x;
            this.velocity.y = dirToOwner.y * this.stats.speed * 0.8 + perpComponent.y;
        } else if (!this.isReturning) {
            // Add curve to outward path
            const curveStrength = this.stats.speed * 0.6; // Less curve on the outward path
            const perpComponent = {
                x: -this.initialDirection.y * this.curveDirection * curveStrength,
                y: this.initialDirection.x * this.curveDirection * curveStrength
            };

            // Combine direct and perpendicular components
            this.velocity.x = this.initialDirection.x * this.stats.speed * 0.8 + perpComponent.x;
            this.velocity.y = this.initialDirection.y * this.stats.speed * 0.8 + perpComponent.y;
        }

        // Check for hits
        if (targets && targets.length > 0) {
            this.checkHits(targets);
        }
    }

    protected checkHits(targets: Entity[]): void {
        for (const target of targets) {
            // Skip if target is the owner or was already hit
            if (target === this.owner || !target.isAlive()) continue;

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
        // Call parent takeDamage which will destroy the projectile
        super.takeDamage(amount, knockbackDir, knockbackForce);
    }
} 