import * as PIXI from 'pixi.js';
import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { Boomerang } from '../weapons/Boomerang';
import { Entity } from '../Entity';

export class BoomerangEnemy extends BaseEnemy {
    private static readonly STATS: EnemyStats = {
        health: 35,
        speed: 0.2,
        maxSpeed: 0.5,
        chaseRange: 600, // Good range for boomerang throws
        color: 0x8B4513, // Wooden color
        movementRestriction: 0.4, // Restricted movement during throw
        windupRestriction: 0.6, // Better mobility during windup
        chaseDuration: 3000, // 3 seconds
        knockbackResistance: 0.2,
        maxRotateSpeed: 3.0 // Medium turning speed
    };

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, BoomerangEnemy.STATS);
    }

    protected initializeWeapon(): void {
        this.weapon = new Boomerang(this, true);
        this.addChild(this.weapon);
    }

    public update(delta: number, targets: Entity[] = []): void {
        if (!this.isAlive()) return;

        // Update weapon first
        this.weapon.update(delta, [this.player, ...targets]);

        // Call parent update for normal behavior
        super.update(delta, targets);

        // Additional boomerang-specific behavior
        if (!this.stunned && !this.weapon.isInWindUp()) {
            const distance = this.distanceToPlayer();
            
            // Try to maintain optimal throwing range
            if (distance < this.attackRange * 0.7) {
                // Too close, back away faster
                this.velocity.x *= 1.2;
                this.velocity.y *= 1.2;
            } else if (distance > this.attackRange * 1.3) {
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

    protected drawSprite(): void {
        this.sprite.beginFill(this.stats.color);
        // Triangular shape with curved sides for boomerang thrower
        this.sprite.moveTo(-10, -10);
        this.sprite.quadraticCurveTo(5, 0, -10, 10);
        this.sprite.lineTo(-10, -10);
        this.sprite.endFill();

        // Add some tribal markings
        this.sprite.lineStyle(1, 0x654321);
        this.sprite.moveTo(-8, -6);
        this.sprite.lineTo(-4, -6);
        this.sprite.moveTo(-8, 0);
        this.sprite.lineTo(-4, 0);
        this.sprite.moveTo(-8, 6);
        this.sprite.lineTo(-4, 6);
    }
} 