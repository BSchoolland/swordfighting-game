import * as PIXI from 'pixi.js';
import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { Dagger } from '../weapons/Dagger';

export class FastEnemy extends BaseEnemy {
    private static readonly STATS: EnemyStats = {
        health: 25, // Low health
        speed: 1, 
        maxSpeed: 3,
        chaseRange: 600, // Aggressive chase range
        color: 0xFFAA00,
        movementRestriction: 0.8, // High mobility even during attacks
        chaseDuration: 3000, // 3 seconds - more persistent chase for fast enemy
        maxRotateSpeed: 6.0 // Fast turning speed (about 340 degrees per second)
    };

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, FastEnemy.STATS);
    }

    protected initializeWeapon(): void {
        this.weapon = new Dagger(this, true);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.beginFill(this.stats.color);
        // Smaller, pointier triangle for fast enemy
        this.sprite.moveTo(-8, -6);
        this.sprite.lineTo(8, 0);
        this.sprite.lineTo(-8, 6);
        this.sprite.lineTo(-8, -6);
        this.sprite.endFill();
    }
} 