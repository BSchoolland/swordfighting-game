import { Player } from '../Player';
import { BossEnemy } from './BossEnemy';
import { Entity } from '../Entity';
import { HunterBow } from '../weapons/HunterBow';

export class HunterBoss extends BossEnemy {
    private static readonly STATS = {
        health: 250,  // Less health than other bosses due to range advantage
        speed: 0.6,   
        maxSpeed: 1,
        chaseRange: 600, // Longer chase range for ranged combat
        color: 0x00aa44, // Forest green color
        movementRestriction: 0.8, // High mobility
        windupRestriction: 0.6,
        chaseDuration: 4000,
        knockbackResistance: 0.7, // High knockback resistance
        maxRotateSpeed: 3.5,
        expValue: 2000 
    };

    private dodgeCooldown: number = 0;
    private static readonly DODGE_COOLDOWN = 2000; // 2 seconds between dodges
    private static readonly DODGE_SPEED = 8;
    private static readonly DODGE_DURATION = 300;
    private dodgeTimer: number = 0;
    private isDodging: boolean = false;
    private dodgeDirection: { x: number, y: number } = { x: 0, y: 0 };

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, HunterBoss.STATS, "The Hunter");
    }

    protected initializeWeapon(): void {
        this.weapon = new HunterBow(this, true);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.clear();
        
        // Draw a sleek, angular shape for the hunter
        this.sprite.beginFill(this.stats.color);
        this.sprite.moveTo(-10, -15);  // Top point
        this.sprite.lineTo(15, 0);     // Front point
        this.sprite.lineTo(-10, 15);   // Bottom point
        this.sprite.lineTo(-15, 0);    // Back point
        this.sprite.lineTo(-10, -15);  // Back to top
        this.sprite.endFill();

        // Add some detail lines
        this.sprite.lineStyle(2, 0x008833);
        this.sprite.moveTo(-5, -7);
        this.sprite.lineTo(5, -7);
        this.sprite.moveTo(-5, 7);
        this.sprite.lineTo(5, 7);
    }

    private performDodge(): void {
        if (this.dodgeCooldown <= 0 && !this.isDodging && this.playerIsAttacking) {
            // Calculate dodge direction perpendicular to player direction
            const dirToPlayer = {
                x: this.player.x - this.x,
                y: this.player.y - this.y
            };
            const length = Math.sqrt(dirToPlayer.x * dirToPlayer.x + dirToPlayer.y * dirToPlayer.y);
            
            // Randomly choose left or right perpendicular direction
            const dodgeLeft = Math.random() < 0.5;
            this.dodgeDirection = {
                x: -dirToPlayer.y / length * (dodgeLeft ? 1 : -1),
                y: dirToPlayer.x / length * (dodgeLeft ? 1 : -1)
            };

            this.isDodging = true;
            this.dodgeTimer = HunterBoss.DODGE_DURATION;
            this.dodgeCooldown = HunterBoss.DODGE_COOLDOWN;
        }
    }

    private maintainDistance(): void {
        const distToPlayer = this.distanceToPlayer();
        const optimalRange = 300; // Optimal shooting distance
        const tolerance = 50; // Range tolerance
        const delta = 1/60; // Use fixed timestep for consistent physics

        if (!this.isDodging) {
            if (distToPlayer < optimalRange - tolerance) {
                // Too close, back away faster and try to dodge if player is attacking
                const dx = this.player.x - this.x;
                const dy = this.player.y - this.y;
                const angle = Math.atan2(dy, dx);
                this.velocity.x -= Math.cos(angle) * this.stats.speed * 1.2 * delta * 60;
                this.velocity.y -= Math.sin(angle) * this.stats.speed * 1.2 * delta * 60;
                this.performDodge();
            } else if (distToPlayer > optimalRange + tolerance) {
                // Too far, move closer
                const dx = this.player.x - this.x;
                const dy = this.player.y - this.y;
                const angle = Math.atan2(dy, dx);
                this.velocity.x += Math.cos(angle) * this.stats.speed * delta * 60;
                this.velocity.y += Math.sin(angle) * this.stats.speed * delta * 60;
            } else {
                
            }
        }
    }

    public update(delta: number, targets: Entity[] = []): void {
        super.update(delta, targets);

        if (!this.stunned) {
            // Update dodge cooldown
            if (this.dodgeCooldown > 0) {
                this.dodgeCooldown -= delta * 1000;
            }

            // Handle dodge movement
            if (this.isDodging) {
                this.dodgeTimer -= delta * 1000;
                this.x += this.dodgeDirection.x * HunterBoss.DODGE_SPEED * delta * 60;
                this.y += this.dodgeDirection.y * HunterBoss.DODGE_SPEED * delta * 60;

                if (this.dodgeTimer <= 0) {
                    this.isDodging = false;
                }
            } else {
                this.maintainDistance();
            }

            // Attack logic
            const distToPlayer = this.distanceToPlayer();
            if (distToPlayer < 400 && !this.isDodging) { // Don't attack while dodging
                this.weapon.swing();
            }
        }
    }
} 