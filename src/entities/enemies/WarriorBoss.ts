import { Player } from '../Player';
import { BossEnemy } from './BossEnemy';
import { Entity } from '../Entity';
import { Hammer } from '../weapons/Hammer';

export class WarriorBoss extends BossEnemy {
    private static readonly STATS = {
        health: 200, // low health for testing
        speed: 0.4,
        maxSpeed: 2.5,
        chaseRange: 600,
        color: 0xcc0000,
        movementRestriction: 0.6,
        windupRestriction: 0.3,
        chaseDuration: 5000,
        knockbackResistance: 0.8,
        maxRotateSpeed: 2.0,
        expValue: 1000 // Bosses give loads of exp
    };

    private dashCooldown: number = 0;
    private static readonly DASH_COOLDOWN = 3000; // 3 seconds
    private static readonly DASH_SPEED = 8;

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, WarriorBoss.STATS, "The Warrior");
    }

    protected initializeWeapon(): void {
        this.weapon = new Hammer(this, true);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.clear();
        
        // Larger, more intimidating triangle for the boss
        this.sprite.beginFill(this.stats.color);
        this.sprite.moveTo(-20, -20);
        this.sprite.lineTo(20, 0);
        this.sprite.lineTo(-20, 20);
        this.sprite.lineTo(-20, -20);
        this.sprite.endFill();

        // Add some armor details
        this.sprite.lineStyle(2, 0x800000);
        this.sprite.moveTo(-15, 0);
        this.sprite.lineTo(0, 0);
        this.sprite.moveTo(-15, -10);
        this.sprite.lineTo(-5, -10);
        this.sprite.moveTo(-15, 10);
        this.sprite.lineTo(-5, 10);
    }

    public update(delta: number, targets: Entity[] = []): void {
        super.update(delta, targets);

        if (!this.stunned) {
            // Update dash cooldown
            if (this.dashCooldown > 0) {
                this.dashCooldown -= delta * 1000;
            }

            const distance = this.distanceToPlayer();
            
            // Dash attack when in range and off cooldown
            if (distance < this.stats.chaseRange * 0.8 && distance > 100 && this.dashCooldown <= 0) {
                this.performDash();
            }

            // Always try to attack when in range
            if (distance < this.attackRange * 1.5) {
                this.weapon.swing();
            }
        }
    }

    private performDash(): void {
        // Calculate direction to player
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const angle = Math.atan2(dy, dx);

        // Apply dash velocity
        this.velocity.x = Math.cos(angle) * WarriorBoss.DASH_SPEED;
        this.velocity.y = Math.sin(angle) * WarriorBoss.DASH_SPEED;

        // Start cooldown
        this.dashCooldown = WarriorBoss.DASH_COOLDOWN;
    }
} 