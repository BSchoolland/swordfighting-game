import * as PIXI from 'pixi.js';
import { Entity } from './Entity';
import { Player } from './Player';
import { Sword } from './Sword';

export class Enemy extends Entity {
    private sprite: PIXI.Graphics;
    private speed: number = 0.5;
    private player: Player;
    private static readonly CHASE_RANGE = 250;
    private maxSpeed: number = 2;
    private stunned: boolean = false;
    private stunTimer: number = 0;
    private static readonly STUN_DURATION = 200;
    private static readonly KNOCKBACK_THRESHOLD = 0.5;
    private sword: Sword;
    private attackRange: number;
    private retreatRange: number;
    private canMoveWhileWindingUp: boolean = false;

    constructor(bounds: { width: number; height: number }, player: Player, canMoveWhileWindingUp: boolean = false) {
        super(bounds, 40);
        this.player = player;
        this.canMoveWhileWindingUp = canMoveWhileWindingUp;

        this.sprite = new PIXI.Graphics();
        this.sprite.beginFill(0xff0000);
        this.sprite.moveTo(-10, -10);
        this.sprite.lineTo(10, 0);
        this.sprite.lineTo(-10, 10);
        this.sprite.lineTo(-10, -10);
        this.sprite.endFill();
        
        this.addChild(this.sprite);

        this.sword = new Sword(this, true);
        this.addChild(this.sword);

        // Get weapon ranges
        const ranges = this.sword.getRange();
        this.attackRange = ranges.attackRange;
        this.retreatRange = ranges.retreatRange;

        do {
            this.x = Math.random() * (bounds.width - 20) + 10;
            this.y = Math.random() * (bounds.height - 20) + 10;
        } while (this.distanceToPlayer() < 150);
    }

    private distanceToPlayer(): number {
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number): void {
        super.takeDamage(amount, knockbackDir, knockbackForce);
        this.stunned = true;
        this.stunTimer = Enemy.STUN_DURATION;
    }

    public update(delta: number): void {
        if (!this.isAlive()) return;

        // Update sword first
        this.sword.update(delta, [this.player]);

        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

        // Handle stun and knockback first
        if (this.stunned) {
            this.stunTimer -= delta * 16.67;
            if (this.stunTimer <= 0 || currentSpeed < Enemy.KNOCKBACK_THRESHOLD) {
                this.stunned = false;
                if (currentSpeed < Enemy.KNOCKBACK_THRESHOLD) {
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                }
            }
            // Apply velocity and knockback while stunned
            this.applyVelocity();
            return;
        }

        // Don't move if winding up and not allowed to
        if (this.sword.isInWindUp() && !this.canMoveWhileWindingUp) {
            this.velocity.x = 0;
            this.velocity.y = 0;
        } else if (!this.stunned) {
            const dx = this.player.x - this.x;
            const dy = this.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Always face the player
            this.rotation = angle;

            if (distance < Enemy.CHASE_RANGE) {
                if (distance > this.attackRange) {
                    // Move towards player if too far
                    this.velocity.x += Math.cos(angle) * this.speed;
                    this.velocity.y += Math.sin(angle) * this.speed;
                } else if (distance < this.retreatRange) {
                    // Back away if too close
                    this.velocity.x -= Math.cos(angle) * this.speed * 1.2;
                    this.velocity.y -= Math.sin(angle) * this.speed * 1.2;
                } else {
                    // In perfect range, slow down and attack
                    this.velocity.x *= 0.8;
                    this.velocity.y *= 0.8;
                    this.sword.swing();
                }

                // Cap velocity
                const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
                if (currentSpeed > this.maxSpeed) {
                    const scale = this.maxSpeed / currentSpeed;
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