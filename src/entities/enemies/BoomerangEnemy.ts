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

    private dodgeCooldown: number = 0;
    private static readonly DODGE_COOLDOWN = 2500; // 2.5 seconds between dodges
    private static readonly DODGE_SPEED = 6; // Slightly slower dodge than flanker
    private static readonly DODGE_DURATION = 400; // 0.4 seconds
    private isDodging: boolean = false;
    private dodgeTimer: number = 0;
    private dodgeDirection: { x: number, y: number } = { x: 0, y: 0 };

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, BoomerangEnemy.STATS);
    }

    protected initializeWeapon(): void {
        this.weapon = new Boomerang(this, true);
        this.addChild(this.weapon);
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

    private startDodge(): void {
        this.isDodging = true;
        this.dodgeTimer = BoomerangEnemy.DODGE_DURATION;
        this.dodgeCooldown = BoomerangEnemy.DODGE_COOLDOWN;

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

    public update(delta: number, targets: Entity[] = []): void {
        if (!this.isAlive()) return;

        // Update weapon first
        this.weapon.update(delta, [this.player, ...targets]);

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
                this.velocity.x = this.dodgeDirection.x * BoomerangEnemy.DODGE_SPEED * delta * 60;
                this.velocity.y = this.dodgeDirection.y * BoomerangEnemy.DODGE_SPEED * delta * 60;
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
                return; // Skip normal movement when starting a dodge
            }
        }

        // Call parent update for normal behavior
        super.update(delta, targets);

        // Additional boomerang-specific behavior
        if (!this.stunned && !this.weapon.isInWindUp() && !this.isDodging) {
            const distance = this.distanceToPlayer();
            
            // Try to maintain optimal throwing range
            if (distance < this.attackRange * 0.7) {
                // Too close, back away faster
                const backawayScale = Math.pow(1.2, 60 * delta);
                this.velocity.x *= backawayScale;
                this.velocity.y *= backawayScale;
            } else if (distance > this.attackRange * 1.3) {
                // Too far, move in
                const dx = this.player.x - this.x;
                const dy = this.player.y - this.y;
                const angle = Math.atan2(dy, dx);
                this.velocity.x += Math.cos(angle) * this.stats.speed * delta * 60;
                this.velocity.y += Math.sin(angle) * this.stats.speed * delta * 60;
            }

            // Attack if in good range and facing player
            if (distance < this.stats.chaseRange && distance > this.attackRange * 0.6) {
                this.weapon.swing();
            }
        }
    }
} 