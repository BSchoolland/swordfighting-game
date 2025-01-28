import { Entity } from '../Entity';
import { Player } from '../Player';
import { SoundManager } from '../../systems/SoundManager';

export interface AbilityStats {
    cooldown: number;
    duration: number;
}

export abstract class BaseAbility {
    protected owner: Entity;
    protected stats: AbilityStats;
    protected isActive: boolean = false;
    protected lastUseTime: number = 0;

    constructor(owner: Entity, stats: AbilityStats) {
        this.owner = owner;
        this.stats = stats;
    }

    public tryActivate(): boolean {
        const currentTime = Date.now();
        if (currentTime - this.lastUseTime >= this.getCooldown()) {
            this.isActive = true;
            this.lastUseTime = currentTime;
            this.onActivate();

            // Play power-up sound for player abilities
            if (this.owner instanceof Player) {
                SoundManager.getInstance().playPowerUpSound();
            }

            return true;
        }
        return false;
    }

    public deactivate(): void {
        if (this.isActive) {
            this.isActive = false;
            this.onDeactivate();
        }
    }

    public isCurrentlyActive(): boolean {
        return this.isActive;
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastUse = currentTime - this.lastUseTime;
        return Math.min(1, timeSinceLastUse / this.getCooldown());
    }

    protected abstract onActivate(): void;
    protected abstract onDeactivate(): void;
    protected abstract getCooldown(): number;
} 