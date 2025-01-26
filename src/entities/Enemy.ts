import * as PIXI from 'pixi.js';
import { Entity } from './Entity';
import { Player } from './Player';

export class Enemy extends Entity {
    private sprite: PIXI.Graphics;
    private speed: number = 0.5; // Halved speed
    private player: Player;
    private static readonly CHASE_RANGE = 250; // Slightly increased chase range
    private maxSpeed: number = 2; // Cap on velocity
    private stunned: boolean = false;
    private stunTimer: number = 0;
    private static readonly STUN_DURATION = 200; // milliseconds
    private static readonly KNOCKBACK_THRESHOLD = 0.5; // Speed threshold to exit stun

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, 40); // Increased health points
        this.player = player;

        // Create enemy sprite (red triangle)
        this.sprite = new PIXI.Graphics();
        this.sprite.beginFill(0xff0000);
        this.sprite.moveTo(-10, -10);
        this.sprite.lineTo(10, 0);
        this.sprite.lineTo(-10, 10);
        this.sprite.lineTo(-10, -10);
        this.sprite.endFill();
        
        this.addChild(this.sprite);

        // Random starting position away from player
        do {
            this.x = Math.random() * (bounds.width - 20) + 10;
            this.y = Math.random() * (bounds.height - 20) + 10;
        } while (this.distanceToPlayer() < 150); // Ensure minimum spawn distance
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

        // Get current velocity magnitude
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

        // Update stun state
        if (this.stunned) {
            this.stunTimer -= delta * 16.67;
            // Exit stun if timer expired or knockback has slowed significantly
            if (this.stunTimer <= 0 || currentSpeed < Enemy.KNOCKBACK_THRESHOLD) {
                this.stunned = false;
                // Clear remaining knockback velocity when exiting stun
                if (currentSpeed < Enemy.KNOCKBACK_THRESHOLD) {
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                }
            }
        }

        // Only chase if not stunned
        if (!this.stunned) {
            const dx = this.player.x - this.x;
            const dy = this.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < Enemy.CHASE_RANGE) {
                const angle = Math.atan2(dy, dx);
                this.velocity.x += Math.cos(angle) * this.speed;
                this.velocity.y += Math.sin(angle) * this.speed;
                this.rotation = angle;

                // Cap chase velocity
                if (currentSpeed > this.maxSpeed) {
                    const scale = this.maxSpeed / currentSpeed;
                    this.velocity.x *= scale;
                    this.velocity.y *= scale;
                }
            } else {
                // Slow down when out of range
                this.velocity.x *= 0.95;
                this.velocity.y *= 0.95;
            }
        }

        // Apply velocity and knockback
        this.applyVelocity();
    }
} 