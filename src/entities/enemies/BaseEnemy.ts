import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { Player } from '../Player';
import { BaseWeapon } from '../weapons/BaseWeapon';

export interface EnemyStats {
    health: number;
    speed: number;
    maxSpeed: number;
    chaseRange: number;
    color: number;
    canMoveWhileWindingUp: boolean;
}

export abstract class BaseEnemy extends Entity {
    protected sprite: PIXI.Graphics;
    protected player: Player;
    protected weapon: BaseWeapon;
    protected stats: EnemyStats;
    protected stunned: boolean = false;
    protected stunTimer: number = 0;
    protected attackRange: number;
    protected retreatRange: number;

    private static readonly STUN_DURATION = 200;
    private static readonly KNOCKBACK_THRESHOLD = 0.5;

    constructor(bounds: { width: number; height: number }, player: Player, stats: EnemyStats) {
        super(bounds, stats.health);
        this.player = player;
        this.stats = stats;

        // Create sprite
        this.sprite = new PIXI.Graphics();
        this.drawSprite();
        this.addChild(this.sprite);

        // Initialize weapon (to be set by child class)
        this.initializeWeapon();

        // Get weapon ranges
        const ranges = this.weapon.getRange();
        this.attackRange = ranges.attackRange;
        this.retreatRange = ranges.retreatRange;

        // Random spawn position away from player
        do {
            this.x = Math.random() * (bounds.width - 20) + 10;
            this.y = Math.random() * (bounds.height - 20) + 10;
        } while (this.distanceToPlayer() < 150);
    }

    protected abstract initializeWeapon(): void;
    protected abstract drawSprite(): void;

    private distanceToPlayer(): number {
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number): void {
        super.takeDamage(amount, knockbackDir, knockbackForce);
        this.stunned = true;
        this.stunTimer = BaseEnemy.STUN_DURATION;
    }

    public update(delta: number): void {
        if (!this.isAlive()) return;

        // Update weapon first
        this.weapon.update(delta, [this.player]);

        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

        // Handle stun and knockback first
        if (this.stunned) {
            this.stunTimer -= delta * 16.67;
            if (this.stunTimer <= 0 || currentSpeed < BaseEnemy.KNOCKBACK_THRESHOLD) {
                this.stunned = false;
                if (currentSpeed < BaseEnemy.KNOCKBACK_THRESHOLD) {
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                }
            }
            // Apply velocity and knockback while stunned
            this.applyVelocity();
            return;
        }

        // Don't move if winding up and not allowed to
        if (this.weapon.isInWindUp() && !this.stats.canMoveWhileWindingUp) {
            this.velocity.x = 0;
            this.velocity.y = 0;
        } else if (!this.stunned) {
            const dx = this.player.x - this.x;
            const dy = this.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Always face the player
            this.rotation = angle;

            if (distance < this.stats.chaseRange) {
                if (distance > this.attackRange) {
                    // Move towards player if too far
                    this.velocity.x += Math.cos(angle) * this.stats.speed;
                    this.velocity.y += Math.sin(angle) * this.stats.speed;
                } else if (distance < this.retreatRange) {
                    // Back away if too close
                    this.velocity.x -= Math.cos(angle) * this.stats.speed * 1.2;
                    this.velocity.y -= Math.sin(angle) * this.stats.speed * 1.2;
                } else {
                    // In perfect range, slow down and attack
                    this.velocity.x *= 0.8;
                    this.velocity.y *= 0.8;
                    this.weapon.swing();
                }

                // Cap velocity
                const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
                if (currentSpeed > this.stats.maxSpeed) {
                    const scale = this.stats.maxSpeed / currentSpeed;
                    this.velocity.x *= scale;
                    this.velocity.y *= scale;
                }
            } else {
                // Outside chase range, slow down
                this.velocity.x *= 0.95;
                this.velocity.y *= 0.95;
            }
        }

        // Apply velocity and knockback
        this.applyVelocity();
    }
} 