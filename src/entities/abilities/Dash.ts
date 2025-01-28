import { Entity } from '../Entity';
import { BaseAbility, AbilityStats } from './BaseAbility';
import { ParticleSystem } from '../../effects/ParticleSystem';

export class Dash extends BaseAbility {
    private static readonly DEFAULT_STATS: AbilityStats = {
        cooldown: 2000, // 2 seconds cooldown
        duration: 200  // 200ms dash duration
    };

    private dashDirection: { dx: number, dy: number } | null = null;
    private originalSpeed: number;
    private dashSpeed: number = 10;
    private dashForce: number = 20;
    private lastAfterimageTime: number = 0;
    private readonly AFTERIMAGE_INTERVAL = 32; // Create afterimage every ~32ms

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

        // Create initial afterimage with appropriate color
        const color = this.owner.isEnemy ? (this.owner as any).getColor?.() || 0xFF0000 : 0x3498db;
        ParticleSystem.getInstance().createAfterimage(this.owner, color);
        this.lastAfterimageTime = Date.now();

        // Set up interval for creating afterimages during dash
        const createAfterimages = () => {
            if (this.isActive) {
                const currentTime = Date.now();
                if (currentTime - this.lastAfterimageTime >= this.AFTERIMAGE_INTERVAL) {
                    ParticleSystem.getInstance().createAfterimage(this.owner, color);
                    this.lastAfterimageTime = currentTime;
                }
                requestAnimationFrame(createAfterimages);
            }
        };
        createAfterimages();
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