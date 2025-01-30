import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { BasicSword } from '../weapons/BasicSword';
import { Entity } from '../Entity';

export class BlitzerEnemy extends BaseEnemy {
    private static readonly STATS: EnemyStats = {
        health: 50,
        speed: 0.15, // Slower base speed
        maxSpeed: 3, // But higher max speed
        chaseRange: 600, // Increased chase range
        color: 0xff00ff, // Magenta color
        movementRestriction: 1.5, // Speeds up during attack
        windupRestriction: 0.3, // Bad mobility during windup
        chaseDuration: 3000, // 3 seconds
        knockbackResistance: 0.2,
        maxRotateSpeed: 6.0 // Quick turning speed
    };

    private static readonly CHARGE_RANGE = 250; // Will start charging attack from this range

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, BlitzerEnemy.STATS);
    }

    protected initializeWeapon(): void {
        this.weapon = new BasicSword(this, true);
        this.addChild(this.weapon);
    }

    public update(delta: number, targets: Entity[] = []): void {
        if (!this.isAlive()) return;

        // Update weapon first
        this.weapon.update(delta, [this.player, ...targets]);

        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

        // Handle stun and knockback first
        if (this.stunned) {
            this.stunTimer -= delta * 16.67;
            if (this.stunTimer <= 0 || currentSpeed < 0.5) {
                this.stunned = false;
                if (currentSpeed < 0.5) {
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                }
            }
            this.applyVelocity();
            return;
        }

        // Calculate movement restriction
        let movementMultiplier = 1.0;
        if (this.weapon.isInWindUp()) {
            movementMultiplier = this.stats.windupRestriction ?? this.stats.movementRestriction;
        } else if (this.weapon.isInSwing()) {
            movementMultiplier = this.stats.movementRestriction;
        }

        // Get positions and calculate distance
        const enemyGlobalPos = this.getGlobalPosition();
        const playerGlobalPos = this.player.getGlobalPosition();
        
        const dx = playerGlobalPos.x - enemyGlobalPos.x;
        const dy = playerGlobalPos.y - enemyGlobalPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const targetAngle = Math.atan2(dy, dx);

        // Always rotate towards player with movement restriction
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
            // Start attack from further away
            if (distance < BlitzerEnemy.CHARGE_RANGE) {
                // Attack and charge forward
                this.weapon.swing();
                this.velocity.x += Math.cos(targetAngle) * this.stats.speed * movementMultiplier * 2;
                this.velocity.y += Math.sin(targetAngle) * this.stats.speed * movementMultiplier * 2;
            } else {
                // Move towards player normally
                this.velocity.x += Math.cos(targetAngle) * this.stats.speed * movementMultiplier;
                this.velocity.y += Math.sin(targetAngle) * this.stats.speed * movementMultiplier;
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

        // Apply velocity
        this.applyVelocity();
    }

    protected drawSprite(): void {
        this.sprite.beginFill(this.stats.color);
        // Sleek, arrow-like shape
        this.sprite.moveTo(-8, -8);
        this.sprite.lineTo(12, 0);
        this.sprite.lineTo(-8, 8);
        this.sprite.lineTo(-4, 0);
        this.sprite.lineTo(-8, -8);
        this.sprite.endFill();

        // Add some speed line details
        this.sprite.lineStyle(1, 0xff66ff);
        this.sprite.moveTo(-6, 0);
        this.sprite.lineTo(-12, 0);
    }
} 