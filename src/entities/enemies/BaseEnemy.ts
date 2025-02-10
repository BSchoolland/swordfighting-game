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
    protected isChasing: boolean = false;
    protected outOfRangeTimer: number = 0;
    public playerIsAttacking: boolean = false;
    public isEnemy: boolean = true;  // Changed to public to match Entity class

    private static readonly STUN_DURATION = 200;
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

        // Random spawn position away from player
        do {
            this.x = Math.random() * (bounds.width - 20) + 10;
            this.y = Math.random() * (bounds.height - 20) + 10;
        } while (this.distanceToPlayer() < 250);
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
        super.takeDamage(amount, knockbackDir, knockbackForce);
        
        // If the enemy died from this damage, award EXP
        if (wasAlive && !this.isAlive()) {
            const expValue = this.stats.expValue || 10; // Default to 10 EXP if not specified
            const leveledUp = this.player.gainExperience(expValue);
            if (leveledUp) {
                // TODO: Trigger level up event or callback
                console.log(`Player leveled up to ${this.player.getLevel()}!`);
            }
        }

        this.stunned = true;
        this.stunTimer = BaseEnemy.STUN_DURATION;
        this.isChasing = true; // Start chasing when damaged
        this.outOfRangeTimer = 0;
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
        // Apply movement restriction to rotation speed
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

        // Apply enemy and screen edge repulsion before movement
        this.applyRepulsion();

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
            this.outOfRangeTimer += delta * 16.67;
            if (this.outOfRangeTimer >= this.stats.chaseDuration) {
                this.isChasing = false;
            }
        }

        if (this.isChasing) {
            if (distance > this.attackRange) {
                // Move towards player if too far
                this.velocity.x += Math.cos(targetAngle) * this.stats.speed * movementMultiplier;
                this.velocity.y += Math.sin(targetAngle) * this.stats.speed * movementMultiplier;
            } else if (distance < this.retreatRange) {
                // Back away if too close
                this.velocity.x -= Math.cos(targetAngle) * this.stats.speed * movementMultiplier * 1.2;
                this.velocity.y -= Math.sin(targetAngle) * this.stats.speed * movementMultiplier * 1.2;
            } else {
                // In perfect range, slow down and attack
                this.velocity.x *= 0.8;
                this.velocity.y *= 0.8;
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
            this.velocity.x *= 0.95;
            this.velocity.y *= 0.95;
        }

        // Apply velocity and knockback
        this.applyVelocity();
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
} 