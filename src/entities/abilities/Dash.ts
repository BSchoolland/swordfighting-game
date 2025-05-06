import { BaseAbility, AbilityStats } from './BaseAbility';
import { SoundManager } from '../../systems/SoundManager';
import { Player } from '../Player';
import { InputManager } from '../../systems/InputManager';

interface DashStats extends AbilityStats {
    dashSpeed: number;
    dashForce: number;
}

export class Dash extends BaseAbility {
    private dashSpeed: number;
    private dashForce: number;
    private dashDirection: { x: number, y: number } = { x: 0, y: 0 };
    private inputManager: InputManager;
    private cooldownMultiplier: number = 1;

    constructor(owner: Player, inputManager: InputManager) {
        const stats: DashStats = {
            cooldown: 2000,
            duration: 200,
            dashSpeed: 8,
            dashForce: 20
        };
        super(owner, stats);
        this.dashSpeed = stats.dashSpeed;
        this.dashForce = stats.dashForce;
        this.inputManager = inputManager;
    }

    public tryActivate(): boolean {
        if (super.tryActivate()) {
            const player = this.owner as Player;
            const speedMultiplier = player.getSpeedMultiplier();
            const adjustedDashSpeed = this.dashSpeed * speedMultiplier;
            const adjustedDuration = this.stats.duration / speedMultiplier;
            
            this.owner.setBaseSpeedDirectly(adjustedDashSpeed);
            this.dashDirection = this.calculateDashDirection();
            
            // Apply initial dash force
            this.owner.velocity.x = this.dashDirection.x * this.dashForce;
            this.owner.velocity.y = this.dashDirection.y * this.dashForce;

            // Play dash sound
            if (this.owner instanceof Player) {
                SoundManager.getInstance().playDashSound();
            }

            // Deactivate after adjusted duration
            setTimeout(() => this.deactivate(), adjustedDuration);
            return true;
        }
        return false;
    }

    protected onActivate(): void {
        // Implementation handled in tryActivate
    }

    protected onDeactivate(): void {
        if (this.owner instanceof Player) {
            this.owner.resetSpeed();
            this.dashDirection = { x: 0, y: 0 };
        }
    }

    protected getCooldown(): number {
        return this.stats.cooldown * this.cooldownMultiplier;
    }

    public reduceCooldown(percentage: number): void {
        this.cooldownMultiplier *= (1 - percentage);
        console.log(`Dash cooldown reduced by ${percentage * 100}%. New multiplier: ${this.cooldownMultiplier}`);
    }

    public getCooldownMultiplier(): number {
        return this.cooldownMultiplier;
    }

    private calculateDashDirection(): { x: number, y: number } {
        const movement = this.inputManager.getMovementVector();
        const length = Math.sqrt(movement.x * movement.x + movement.y * movement.y);
        
        if (length === 0) {
            // If no movement input, dash in the direction the player is facing
            return {
                x: Math.cos(this.owner.rotation),
                y: Math.sin(this.owner.rotation)
            };
        }

        // Use the normalized movement vector
        return {
            x: movement.x / length,
            y: movement.y / length
        };
    }

    public reset(): void {
        this.lastUseTime = 0;
        this.isActive = false;
        this.dashDirection = { x: 0, y: 0 };
        this.cooldownMultiplier = 1;
    }
} 