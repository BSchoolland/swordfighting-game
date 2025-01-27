import { Entity } from '../Entity';

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

    public activate(): void {
        const currentTime = Date.now();
        if (!this.isActive && currentTime - this.lastUseTime >= this.stats.cooldown) {
            this.isActive = true;
            this.lastUseTime = currentTime;
            this.onActivate();
            
            // Automatically end ability after duration
            setTimeout(() => {
                this.isActive = false;
                this.onDeactivate();
            }, this.stats.duration);
        }
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastUse = currentTime - this.lastUseTime;
        return Math.min(1, timeSinceLastUse / this.stats.cooldown);
    }

    public isActiveNow(): boolean {
        return this.isActive;
    }

    protected abstract onActivate(): void;
    protected abstract onDeactivate(): void;
} 