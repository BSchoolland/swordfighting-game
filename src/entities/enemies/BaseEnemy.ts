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
    movementRestriction: number; // 0 = no movement, 1 = full movement during swing
    windupRestriction?: number; // Optional different restriction during windup
    chaseDuration: number; // How long enemy must be out of range before stopping chase
    knockbackResistance?: number; // Value between 0 and 1, where 1 means complete knockback immunity
    maxRotateSpeed: number; // Maximum rotation speed in radians per second
    expValue?: number; // Experience points awarded when killed
}

export abstract class BaseEnemy extends Entity {
    protected override sprite: PIXI.Graphics;
    protected player: Player;
    protected weapon!: BaseWeapon;
    protected stats: EnemyStats;
    protected stunned: boolean = false;
    protected stunTimer: number = 0;
    protected stunImmunity: number = 500 // 500ms immunity after waking up from stun
    protected stunImmunityTimer: number = 0;
    protected isChasing: boolean = false;
    protected outOfRangeTimer: number = 0;
    public playerIsAttacking: boolean = false;
    public isEnemy: boolean = true;  // Changed to public to match Entity class

    private static readonly STUN_DURATION = 1000;
    private static readonly KNOCKBACK_THRESHOLD = 0.5;
    private static readonly REPULSION_RANGE = 100; // Distance at which enemies start repelling each other
    private static readonly REPULSION_FORCE = 0.3; // Strength of the repulsion
    private static readonly SCREEN_EDGE_REPULSION_RANGE = 50; // Distance from screen edge to start repelling
    private static readonly SCREEN_EDGE_REPULSION_FORCE = 2; // Much stronger than enemy repulsion to keep enemies away from edges

    constructor(bounds: { width: number; height: number }, player: Player, stats: EnemyStats) {
        super(bounds, stats.health);
        this.player = player;
        this.stats = stats;
        this.isEnemy = true;  // Set isEnemy to true for all enemies

        // Create sprite
        this.sprite = new PIXI.Graphics();
        this.drawSprite();
        this.updateRadiusFromSprite(); // Set radius after drawing
        this.addChild(this.sprite);

        // Initialize weapon (to be set by child class)
        this.initializeWeapon();
    }

    protected abstract initializeWeapon(): void;
    protected abstract drawSprite(): void;

    protected distanceToPlayer(): number {
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number): void {
        const wasAlive = this.isAlive();
        // don't allow stacking stun
        if (!this.stunned && this.stunImmunityTimer <= 0) {
            this.stunned = true;
            this.stunTimer = BaseEnemy.STUN_DURATION;
            this.isChasing = true; // Start chasing when damaged
            this.outOfRangeTimer = 0;
            // knockback on stun
            super.takeDamage(amount, knockbackDir, knockbackForce);
        } else {
            super.takeDamage(amount, knockbackDir, 0); // no knockback if already stunned
        }
        
        
        // If the enemy died from this damage, award EXP
        if (wasAlive && !this.isAlive()) {
            const expValue = this.stats.expValue || 10; // Default to 10 EXP if not specified
            const leveledUp = this.player.gainExperience(expValue);
            if (leveledUp) {
                // TODO: Trigger level up event or callback
                console.log(`Player leveled up to ${this.player.getLevel()}!`);
            }
        }
        
    }

    public applyRepulsion(): void {
        // Get all enemies in the scene
        const enemies = this.parent?.children.filter(
            child => child instanceof BaseEnemy && child !== this
        ) as BaseEnemy[];

        if (!enemies) return;

        // Calculate repulsion from each nearby enemy
        for (const enemy of enemies) {
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < BaseEnemy.REPULSION_RANGE && distance > 0) {
                // Calculate repulsion force (stronger when closer)
                const force = (1 - distance / BaseEnemy.REPULSION_RANGE) * BaseEnemy.REPULSION_FORCE;
                const angle = Math.atan2(dy, dx);

                // Apply repulsion
                this.velocity.x += Math.cos(angle) * force;
                this.velocity.y += Math.sin(angle) * force;
            }
        }

        // Apply screen edge repulsion
        // Left edge
        if (this.x < BaseEnemy.SCREEN_EDGE_REPULSION_RANGE) {
            const force = (1 - this.x / BaseEnemy.SCREEN_EDGE_REPULSION_RANGE) * BaseEnemy.SCREEN_EDGE_REPULSION_FORCE;
            this.velocity.x += force;
        }
        // Right edge
        if (this.bounds.width - this.x < BaseEnemy.SCREEN_EDGE_REPULSION_RANGE) {
            const force = (1 - (this.bounds.width - this.x) / BaseEnemy.SCREEN_EDGE_REPULSION_RANGE) * BaseEnemy.SCREEN_EDGE_REPULSION_FORCE;
            this.velocity.x -= force;
        }
        // Top edge
        if (this.y < BaseEnemy.SCREEN_EDGE_REPULSION_RANGE) {
            const force = (1 - this.y / BaseEnemy.SCREEN_EDGE_REPULSION_RANGE) * BaseEnemy.SCREEN_EDGE_REPULSION_FORCE;
            this.velocity.y += force;
        }
        // Bottom edge
        if (this.bounds.height - this.y < BaseEnemy.SCREEN_EDGE_REPULSION_RANGE) {
            const force = (1 - (this.bounds.height - this.y) / BaseEnemy.SCREEN_EDGE_REPULSION_RANGE) * BaseEnemy.SCREEN_EDGE_REPULSION_FORCE;
            this.velocity.y -= force;
        }
    }

    protected normalizeAngle(angle: number): number {
        // Normalize angle to [-PI, PI]
        return ((angle % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    }

    protected getAngleDifference(targetAngle: number, currentAngle: number): number {
        // Get the smallest angle difference (accounting for wraparound)
        let diff = this.normalizeAngle(targetAngle - currentAngle);
        return diff;
    }

    protected rotateTowards(targetAngle: number, delta: number, movementMultiplier: number): void {
        const angleDiff = this.getAngleDifference(targetAngle, this.rotation);
        
        // Apply movement restriction to rotation speed (radians per second)
        // Multiply by delta to get frame rotation
        const frameRotateSpeed = this.stats.maxRotateSpeed * delta * movementMultiplier;
        
        // If we're close enough to the target angle, snap to it
        if (Math.abs(angleDiff) < frameRotateSpeed) {
            this.rotation = targetAngle;
            return;
        }

        // Otherwise rotate towards it at max speed
        const rotationDirection = angleDiff > 0 ? 1 : -1;
        const newRotation = this.rotation + (rotationDirection * frameRotateSpeed);
        this.rotation = newRotation;
    }

    public update(delta: number, targets: Entity[] = []): void {
        if (!this.isAlive()) return;

        // Update weapon first
        this.weapon.update(delta, [this.player, ...targets]);

        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

        // Apply enemy and screen edge repulsion before movement
        this.applyRepulsion();

        // Handle stun and knockback first
        if (this.stunned) {
            // start stun timer
            this.stunTimer -= delta * 1000;
            if (currentSpeed < BaseEnemy.KNOCKBACK_THRESHOLD || this.stunTimer <= 0) {
                this.stunned = false;
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
            // Apply velocity and knockback while stunned
            this.applyVelocity(delta);
            return;
        } else if (this.stunImmunityTimer > 0) {
            // Decrement immunity timer based on delta time in seconds
            this.stunImmunityTimer -= delta * 1000;
            if (this.stunImmunityTimer < 0) this.stunImmunityTimer = 0;
            // continue, we're not stunned
        }

        // Calculate movement restriction
        let movementMultiplier = 1.0;
        if (this.weapon.isInWindUp()) {
            // Use windup restriction if specified, otherwise use regular restriction
            movementMultiplier = this.stats.windupRestriction ?? this.stats.movementRestriction;
        } else if (this.weapon.isInSwing()) {
            // Use regular movement restriction during swing
            movementMultiplier = this.stats.movementRestriction;
        }

        // Get absolute positions
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const targetAngle = Math.atan2(dy, dx);
        
        // Smoothly rotate towards the player with movement restriction
        this.rotateTowards(targetAngle, delta, movementMultiplier);

        // Update chase state
        if (distance < this.stats.chaseRange) {
            this.isChasing = true;
            this.outOfRangeTimer = 0;
        } else if (this.isChasing) {
            // Use delta time in seconds * 1000 to convert to milliseconds
            this.outOfRangeTimer += delta * 1000;
            if (this.outOfRangeTimer >= this.stats.chaseDuration) {
                this.isChasing = false;
            }
        }

        if (this.isChasing) {
            if (distance > this.attackRange) {
                // Move towards player if too far
                this.velocity.x += Math.cos(targetAngle) * this.stats.speed * movementMultiplier * delta * 60;
                this.velocity.y += Math.sin(targetAngle) * this.stats.speed * movementMultiplier * delta * 60;
            } else if (distance < this.retreatRange) {
                // Back away if too close
                this.velocity.x -= Math.cos(targetAngle) * this.stats.speed * movementMultiplier * 1.2 * delta * 60;
                this.velocity.y -= Math.sin(targetAngle) * this.stats.speed * movementMultiplier * 1.2 * delta * 60;
            } else {
                // In attack range, if not in center of range, move towards center of range
                if (distance > (this.attackRange + this.retreatRange)/2) {
                    this.velocity.x += Math.cos(targetAngle) * this.stats.speed * movementMultiplier * delta * 60;
                    this.velocity.y += Math.sin(targetAngle) * this.stats.speed * movementMultiplier * delta * 60;
                } else {
                    // Use a frame-rate independent approach to reduce velocity
                    const reductionFactor = Math.pow(0.01, 60 * delta);
                    this.velocity.x *= reductionFactor;
                    this.velocity.y *= reductionFactor;
                }
                this.weapon.swing();
            }

            // Cap velocity (considering movement restriction)
            const maxSpeed = this.stats.maxSpeed * movementMultiplier;
            if (currentSpeed > maxSpeed) {
                const scale = maxSpeed / currentSpeed;
                this.velocity.x *= scale;
                this.velocity.y *= scale;
            }
        } else {
            // Outside chase range and not chasing, slow down
            // Make slowdown framerate-independent
            const slowdownFactor = Math.pow(0.95, 60 * delta);
            this.velocity.x *= slowdownFactor;
            this.velocity.y *= slowdownFactor;
        }

        // Apply velocity and knockback
        this.applyVelocity(delta);
    }

    public getColor(): number {
        return this.stats.color;
    }

    // Helper methods to get current weapon ranges
    protected get attackRange(): number {
        const range = this.weapon.getRange().attackRange;
        return range;
    }

    protected get retreatRange(): number {
        const range = this.weapon.getRange().retreatRange;
        return range;
    }

    protected updateRadiusFromSprite(): void {
        // Calculate radius based on the sprite's bounds
        const bounds = this.sprite.getBounds();
        // Use the larger of width/height divided by 2 for the radius
        this.radius = Math.max((Math.max(bounds.width, bounds.height) / 2) - 10, 0);
    }

    protected updateHealthBar(): void {
        if (this.healthBar) {
            // Check if the healthBar has an updateHealth method (HealthBar or BossHealthBar)
            if ('updateHealth' in this.healthBar) {
                (this.healthBar as any).updateHealth(this.health, this.maxHealth);
            }
        }
    }
} 