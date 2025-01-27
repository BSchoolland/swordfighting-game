import * as PIXI from 'pixi.js';
import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { BasicSword } from '../weapons/BasicSword';
import { Entity } from '../Entity';

export class FlankerEnemy extends BaseEnemy {
    private static readonly STATS: EnemyStats = {
        health: 30,
        speed: 0.6, // Fast base speed
        maxSpeed: 2.5,
        chaseRange: 350, // No a lot of chase range
        color: 0x00ffff, // Cyan color
        movementRestriction: 0.2, // Very restricted during attack
        windupRestriction: 0.1, // Almost no movement during windup
        chaseDuration: 4000, // 4 seconds
        knockbackResistance: 0.1, // Easy to knock back
        maxRotateSpeed: 6.0 // Very fast turning
    };

    private dodgeCooldown: number = 0;
    private static readonly DODGE_COOLDOWN = 2500; // 2.5 seconds between dodges
    private static readonly DODGE_SPEED = 8;
    private static readonly DODGE_DURATION = 400; // 0.4 seconds
    private isDodging: boolean = false;
    private dodgeTimer: number = 0;
    private dodgeDirection: { x: number, y: number } = { x: 0, y: 0 };

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, FlankerEnemy.STATS);
    }

    protected initializeWeapon(): void {
        this.weapon = new BasicSword(this, true);88
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.beginFill(this.stats.color);
        // Nimble, diamond shape
        this.sprite.moveTo(0, -10);
        this.sprite.lineTo(10, 0);
        this.sprite.lineTo(0, 10);
        this.sprite.lineTo(-10, 0);
        this.sprite.lineTo(0, -10);
        this.sprite.endFill();

        // Add some agile-looking details
        this.sprite.lineStyle(1, 0x66ffff);
        this.sprite.moveTo(-5, -5);
        this.sprite.lineTo(5, 5);
        this.sprite.moveTo(-5, 5);
        this.sprite.lineTo(5, -5);
    }

    public update(delta: number, targets: Entity[] = []): void {
        if (!this.isAlive()) return;

        // Update dodge cooldown
        if (this.dodgeCooldown > 0) {
            this.dodgeCooldown -= delta * 1000; // Convert delta seconds to ms
        }

        // Handle dodge state
        if (this.isDodging) {
            this.dodgeTimer -= delta * 1000; // Convert delta seconds to ms
            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
                this.velocity.x = 0;
                this.velocity.y = 0;
            } else {
                // Apply dodge velocity
                this.velocity.x = this.dodgeDirection.x * FlankerEnemy.DODGE_SPEED;
                this.velocity.y = this.dodgeDirection.y * FlankerEnemy.DODGE_SPEED;
                this.applyVelocity();
                return; // Skip normal movement while dodging
            }
        }

        // Try to dodge if player is attacking and we're in range
        if (!this.isDodging && this.dodgeCooldown <= 0) {
            const dx = this.player.x - this.x;
            const dy = this.player.y - this.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // Check if we're in danger range and player is attacking
            if (distToPlayer < 200 && this.playerIsAttacking) {
                this.startDodge();
            }
        }

        // Call parent update for normal behavior
        super.update(delta, targets);
    }

    private startDodge(): void {
        this.isDodging = true;
        this.dodgeTimer = FlankerEnemy.DODGE_DURATION;
        this.dodgeCooldown = FlankerEnemy.DODGE_COOLDOWN;

        // Dodge perpendicular to the direction to the player
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const angle = Math.atan2(dy, dx);
        
        // Randomly dodge left or right relative to player
        const dodgeAngle = angle + (Math.random() < 0.5 ? Math.PI/2 : -Math.PI/2);
        
        this.dodgeDirection = {
            x: Math.cos(dodgeAngle),
            y: Math.sin(dodgeAngle)
        };
    }
} 