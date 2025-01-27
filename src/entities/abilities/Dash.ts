import { Entity } from '../Entity';
import { BaseAbility, AbilityStats } from './BaseAbility';

export class Dash extends BaseAbility {
    private static readonly DEFAULT_STATS: AbilityStats = {
        cooldown: 2000, // 2 seconds cooldown
        duration: 200  // 200ms dash duration
    };

    private dashDirection: { dx: number, dy: number } | null = null;
    private originalSpeed: number;
    private dashSpeed: number = 10;
    private dashForce: number = 20;

    constructor(owner: Entity, stats: AbilityStats = Dash.DEFAULT_STATS) {
        super(owner, stats);
        // Store the original speed to restore it after dash
        this.originalSpeed = owner.getSpeed();
    }

    public tryActivate(): boolean {
        const currentTime = Date.now();
        if (currentTime - this.lastUseTime >= this.stats.cooldown) {
            this.activate();
            return true;
        }
        return false;
    }

    protected onActivate(): void {
        // Apply dash force
        const angle = this.owner.rotation;
        this.owner.velocity.x += Math.cos(angle) * this.dashForce;
        this.owner.velocity.y += Math.sin(angle) * this.dashForce;

        // Calculate dash direction from current movement
        const velocity = this.owner.getVelocity();
        const length = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        if (length > 0) {
            this.dashDirection = {
                dx: velocity.x / length,
                dy: velocity.y / length
            };
            // Set dash speed
            this.owner.setSpeed(this.dashSpeed);
        }
    }

    protected onDeactivate(): void {
        // Reset speed and clear dash direction
        this.owner.setSpeed(this.originalSpeed);
        this.dashDirection = null;
    }

    public getDashDirection(): { dx: number, dy: number } | null {
        return this.dashDirection;
    }
} 