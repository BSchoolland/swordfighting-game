import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { Bow } from '../weapons/Bow';

export class RangedEnemy extends BaseEnemy {
    private static readonly STATS: EnemyStats = {
        health: 30,
        speed: 0.2, // very slow
        maxSpeed: 0.5,
        chaseRange: 600, // Longer range for archer
        color: 0x00AA00, // Green color
        movementRestriction: 0.7, // Good mobility but reduced during attacks
        chaseDuration: 3000, // 3 seconds chase duration
        maxRotateSpeed: 3.0, // Medium-slow turning speed (about 170 degrees per second)
        expValue: 20 // Ranged enemies give 20 EXP
    };

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, RangedEnemy.STATS);
        this.target = player;  // Set player as the target
    }

    protected initializeWeapon(): void {
        this.weapon = new Bow(this, true);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.beginFill(this.stats.color);
        // Diamond shape for ranged enemy
        this.sprite.moveTo(0, -10);
        this.sprite.lineTo(10, 0);
        this.sprite.lineTo(0, 10);
        this.sprite.lineTo(-10, 0);
        this.sprite.lineTo(0, -10);
        this.sprite.endFill();
    }

    public update(delta: number): void {
        super.update(delta);

        if (!this.stunned && !this.weapon.isInWindUp()) {
            const distance = this.distanceToPlayer();
            
            // Try to maintain optimal range
            if (distance < this.attackRange * 0.8) {
                // Too close, back away faster
                this.velocity.x *= 1.2;
                this.velocity.y *= 1.2;
            } else if (distance > this.attackRange * 1.2) {
                // Too far, move in
                const dx = this.player.x - this.x;
                const dy = this.player.y - this.y;
                const angle = Math.atan2(dy, dx);
                this.velocity.x += Math.cos(angle) * this.stats.speed;
                this.velocity.y += Math.sin(angle) * this.stats.speed;
            }

            // Attack if in good range and facing player
            if (distance < this.stats.chaseRange && distance > this.attackRange * 0.6) {
                this.weapon.swing();
            }
        } 
    }
} 