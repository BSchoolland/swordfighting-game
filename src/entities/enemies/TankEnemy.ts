import * as PIXI from 'pixi.js';
import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { Hammer } from '../weapons/Hammer';

export class TankEnemy extends BaseEnemy {
    private static readonly STATS: EnemyStats = {
        health: 80, // High health
        speed: 0.3, // Slow movement
        maxSpeed: 1.2,
        chaseRange: 300, // Shorter chase range
        color: 0x666666,
        movementRestriction: 0.3, // Very restricted movement, especially during attacks
        chaseDuration: 4000, // 4 seconds - very persistent once angered
        knockbackResistance: 0.6, // Significant knockback resistance
        maxRotateSpeed: 1.8 // Very slow turning speed (about 100 degrees per second)
    };

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, TankEnemy.STATS);
    }

    public takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number): void {
        // Apply knockback resistance
        const reducedKnockback = knockbackForce * (1 - this.stats.knockbackResistance!);
        super.takeDamage(amount, knockbackDir, reducedKnockback);
    }

    protected initializeWeapon(): void {
        this.weapon = new Hammer(this, true);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.beginFill(this.stats.color);
        // Larger, more square triangle for tank
        this.sprite.moveTo(-12, -12);
        this.sprite.lineTo(12, 0);
        this.sprite.lineTo(-12, 12);
        this.sprite.lineTo(-12, -12);
        this.sprite.endFill();
        
        // Add some armor details
        this.sprite.lineStyle(2, 0x444444);
        this.sprite.moveTo(-8, -8);
        this.sprite.lineTo(-8, 8);
        this.sprite.moveTo(-4, -4);
        this.sprite.lineTo(-4, 4);
    }
} 