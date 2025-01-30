import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { Spear } from '../weapons/Spear';

export class SpearEnemy extends BaseEnemy {
    private static readonly STATS: EnemyStats = {
        health: 45,
        speed: 0.4, // Slower than basic enemy
        maxSpeed: 1.0,
        chaseRange: 600, // Longer chase range due to spear
        color: 0xaa4444,
        movementRestriction: 0, // Very restricted movement during thrust
        windupRestriction: 0.2, // Still quite restricted while winding up
        chaseDuration: 2500, // 2.5 seconds
        knockbackResistance: 0.3, // More stable stance than basic enemy
        maxRotateSpeed: 2.4 // Slow turning speed (about 140 degrees per second)
    };

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, SpearEnemy.STATS);
    }

    protected initializeWeapon(): void {
        this.weapon = new Spear(this, true);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.beginFill(this.stats.color);
        // Taller, more rectangular shape for spear enemy
        this.sprite.moveTo(-8, -12);
        this.sprite.lineTo(8, -8);
        this.sprite.lineTo(8, 8);
        this.sprite.lineTo(-8, 12);
        this.sprite.lineTo(-8, -12);
        this.sprite.endFill();

        // Add some armor details
        this.sprite.lineStyle(2, 0x883333);
        this.sprite.moveTo(-4, -8);
        this.sprite.lineTo(-4, 8);
    }
} 