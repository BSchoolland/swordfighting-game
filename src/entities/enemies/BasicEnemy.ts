import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { BasicSword } from '../weapons/BasicSword';

export class BasicEnemy extends BaseEnemy {
    private static readonly DEFAULT_STATS: EnemyStats = {
        health: 40,
        speed: 0.5,
        maxSpeed: 2,
        chaseRange: 550,
        color: 0xff0000,
        movementRestriction: 0.6, // Moderate movement restriction during swing
        windupRestriction: 0, // More restricted during windup
        chaseDuration: 2000, // 2 seconds
        knockbackResistance: 0.1, // Small amount of knockback resistance
        maxRotateSpeed: 4.0 // Medium turning speed (about 230 degrees per second)
    };

    constructor(bounds: { width: number; height: number }, player: Player, canMoveWhileWindingUp: boolean = false) {
        const stats = { ...BasicEnemy.DEFAULT_STATS, canMoveWhileWindingUp };
        super(bounds, player, stats);
    }

    protected initializeWeapon(): void {
        this.weapon = new BasicSword(this, true);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.beginFill(this.stats.color);
        this.sprite.moveTo(-10, -10);
        this.sprite.lineTo(10, 0);
        this.sprite.lineTo(-10, 10);
        this.sprite.lineTo(-10, -10);
        this.sprite.endFill();
    }
} 