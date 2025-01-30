import { Player } from '../Player';
import { BossEnemy } from './BossEnemy';
import { Entity } from '../Entity';
import { BaseWeapon } from '../weapons/BaseWeapon';
import { MasterSword, MasterHammer, MasterSpear, MasterDagger, MasterBoomerang } from '../weapons/MasterWeapons';
import { HunterBow } from '../weapons/HunterBow';

export class MasterOfArmsBoss extends BossEnemy {
    private static readonly STATS = {
        health: 500,
        speed: 0.5,
        maxSpeed: 2.5,
        chaseRange: 600,
        color: 0xFFD700, // Gold color for the master
        movementRestriction: 0.7,
        windupRestriction: 0.5,
        chaseDuration: 5000,
        knockbackResistance: 0.5,
        maxRotateSpeed: 3.0
    };

    private weaponTypes: (new (owner: Entity) => BaseWeapon)[] = [
        MasterSword,
        MasterHammer,
        MasterSpear,
        HunterBow,
        MasterDagger,
        MasterBoomerang
    ];

    private weaponSwapTimer: number = 0;
    private static readonly WEAPON_SWAP_INTERVAL = 2000;
    private currentWeaponIndex: number = 0;

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, MasterOfArmsBoss.STATS, "The Master of Arms");
    }

    protected initializeWeapon(): void {
        // Start with master sword
        this.weapon = new MasterSword(this);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.clear();
        
        // Draw a more complex, master-like shape
        this.sprite.beginFill(this.stats.color);
        
        // Main body - hexagonal shape
        const size = 20;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const nextAngle = ((i + 1) * Math.PI * 2) / 6;
            if (i === 0) {
                this.sprite.moveTo(
                    Math.cos(angle) * size,
                    Math.sin(angle) * size
                );
            }
            this.sprite.lineTo(
                Math.cos(nextAngle) * size,
                Math.sin(nextAngle) * size
            );
        }
        this.sprite.endFill();

        // Add decorative details
        this.sprite.lineStyle(2, 0xFFF0B0);
        // Inner star pattern
        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2) / 3;
            this.sprite.moveTo(0, 0);
            this.sprite.lineTo(
                Math.cos(angle) * size * 0.8,
                Math.sin(angle) * size * 0.8
            );
        }
    }

    private switchToRandomWeapon(): void {
        // Don't swap if currently attacking or winding up
        if (this.weapon && (this.weapon.isSwinging || this.weapon.isWindingUp)) {
            // set timeout to try again in 10ms
            setTimeout(() => {
                this.switchToRandomWeapon();
            }, 10);
            return;
        }

        // Remove current weapon
        if (this.weapon) {
            this.removeChild(this.weapon);
        }

        // Pick a random weapon type different from current
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * this.weaponTypes.length);
        } while (newIndex === this.currentWeaponIndex);

        this.currentWeaponIndex = newIndex;
        
        
        // Create and add new weapon
        const WeaponClass = this.weaponTypes[this.currentWeaponIndex];
        this.weapon = new WeaponClass(this);
        this.addChild(this.weapon);

        // Adjust stats based on weapon type AFTER creating weapon
        if (this.weapon instanceof MasterDagger) {
            this.stats.speed = 1.0; // Double the base speed of 0.5
            this.stats.maxSpeed = 5; // Increase max speed from 2.5
            this.stats.knockbackResistance = 0.6;
            this.stats.maxRotateSpeed = 5;
        } else if (this.weapon instanceof MasterHammer) {
            this.stats.speed = 0.5; 
            this.stats.maxSpeed = 2.0; // Slightly lower max speed
            this.stats.knockbackResistance = 0.9; // Very high knockback resistance
            this.stats.maxRotateSpeed = 3;
        } else if (this.weapon instanceof MasterSpear) {
            this.stats.speed = 0.5; 
            this.stats.maxSpeed = 2.5; 
            this.stats.knockbackResistance = 0.5;
            this.stats.maxRotateSpeed = 0.75; // very slow turn speed
        } else {
            this.stats.speed = 0.5;
            this.stats.maxSpeed = 2.5;
            this.stats.knockbackResistance = 0.5;
            this.stats.maxRotateSpeed = 3;
        }

        // Create weapon swap effect
        const gameScene = this.parent?.parent as any;
        if (gameScene?.particleSystem) {
            gameScene.particleSystem.createWeaponSwapEffect(this.x, this.y, this.stats.color);
        }
    }

    public update(delta: number, targets: Entity[] = []): void {
        super.update(delta, targets);

        if (!this.stunned) {
            // Update weapon swap timer
            this.weaponSwapTimer += delta * 1000; // Convert to milliseconds
            if (this.weaponSwapTimer >= MasterOfArmsBoss.WEAPON_SWAP_INTERVAL) {
                this.weaponSwapTimer = 0;
                this.switchToRandomWeapon();
            }

            // Get distance to player
            const distance = this.distanceToPlayer();
            
            // Adjust behavior based on current weapon
            if (this.weapon instanceof HunterBow || this.weapon instanceof MasterBoomerang) {
                // Ranged behavior: maintain distance
                if (distance < 200) {
                    // Too close, back away
                    const angle = Math.atan2(this.y - this.player.y, this.x - this.player.x);
                    this.velocity.x += Math.cos(angle) * this.stats.speed;
                    this.velocity.y += Math.sin(angle) * this.stats.speed;
                }
            } else if (this.weapon instanceof MasterDagger) {
                // Aggressive behavior: stay close
                if (distance < 300) {
                    this.weapon.swing();
                }
            } else {
                // Default behavior for other weapons
                if (distance < this.attackRange * 1.2) {
                    this.weapon.swing();
                }
            }
        }
    }
} 