// @ts-ignore - PIXI is required for inheritance
// PIXI import needed as parent classes extend PIXI.Container
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { WeaponStats } from './BaseWeapon';
import { RangedWeaponStats } from './RangedWeapon';
import { Spear } from './Spear';
import { Dagger } from './Dagger';
import { Boomerang } from './Boomerang';
import { WarriorHammer } from './WarriorHammer';
import { BerserkerSword } from './BerserkerSword';
import { SoundManager } from '../../systems/SoundManager';
// Enhanced Master of Arms Sword
export class MasterSword extends BerserkerSword {
    private static readonly MASTER_PARAMS: WeaponStats = {
        damage: 25, // Increased from 10
        knockback: 3, // Increased from 1
        attackSpeed: 800, // Faster than enemy sword (1000)
        range: 100, // Increased from 40
        swingSpeed: 0.2, // Faster than enemy sword (0.15)
        swingRange: Math.PI * 1.3, // Wider arc than enemy sword
        bladeLength: 100, // Longer than enemy sword (40)
        bladeWidth: 7, // Thicker than enemy sword
        swingInfluence: 0.6,
        color: 0xFFD700, // Gold color
        optimalRange: 0.9,
        retreatRange: 0.7,
        windUpTime: 400, // Faster windup than enemy sword
        previewAlpha: 0.4,
        swingSound: 'master_sword',
        projectileStats: {
            speed: 0,
            damage: 0,
            knockback: 0,
            size: 0,
            color: 0xFFD700,
            lifetime: 0,
            maxRange: 0
        }
    };

    constructor(owner: Entity) {
        super(owner, true);
        this.stats = MasterSword.MASTER_PARAMS;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }
}

// Enhanced Master of Arms Hammer
export class MasterHammer extends WarriorHammer {
    private static readonly MASTER_PARAMS: WeaponStats = {
        damage: 35, // Increased from 20
        knockback: 18, // Increased from 12
        attackSpeed: 1500, // Faster than enemy hammer (2000)
        range: 120, // Increased from 100
        swingSpeed: 0.15, // Faster than enemy hammer
        swingRange: Math.PI * 3.8, // Two full spins
        bladeLength: 150, // Longer than normal
        bladeWidth: 16, // Thicker
        swingInfluence: 0.9,
        color: 0xFFD700, // Gold color
        optimalRange: 1.6,
        retreatRange: 0.7,
        windUpTime: 800,
        previewAlpha: 0.4,
        swingSound: 'master_hammer',
        projectileStats: {
            speed: 0,
            damage: 0,
            knockback: 0,
            size: 0,
            color: 0xFFD700,
            lifetime: 0,
            maxRange: 0
        }
    };

    constructor(owner: Entity) {
        super(owner, true);
        this.stats = MasterHammer.MASTER_PARAMS;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }

    public swing(): void {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;

        if (!this.isWindingUp && !this.isSwinging && timeSinceLastSwing >= this.stats.attackSpeed) {
            this.isWindingUp = true;
            this.windUpStartTime = currentTime;
            this.swingAngle = 0;
            
            // Always start from behind (-π) for the hammer spin
            this.rotation = -Math.PI * 0.9;
            
            this.previewSprite.visible = true;
            this.lastSwingTime = currentTime;
            this.hitEntities.clear();
            
            // Play weapon-specific swing sound if it exists (fixed for master hammer)
            if (this.stats.swingSound) {
                // Wait the windup time
                SoundManager.getInstance().playSound('master_hammer_charge');
                setTimeout(() => {
                    if (this.stats.swingSound) {
                        SoundManager.getInstance().playSound(this.stats.swingSound);
                    }
                }, this.stats.windUpTime);
            }
        }
    }

    public update(_delta: number, targets: Entity[]): void {
        if (this.isWindingUp) {
            const currentTime = Date.now();
            const elapsedWindUpTime = currentTime - this.windUpStartTime;
            const remainingWindUp = this.stats.windUpTime - elapsedWindUpTime;
            
            if (remainingWindUp <= 0) {
                this.isWindingUp = false;
                this.isSwinging = true;
                this.previewSprite.visible = false;
                this.sprite.visible = true;
                this.swingAngle = 0;
            }
        }

        if (this.isSwinging) {
            const prevAngle = this.rotation;
            this.swingAngle += this.stats.swingSpeed;
            
            // Start from -π and rotate through two full spins
            this.rotation = (-Math.PI * 0.9) + this.swingAngle;

            if (this.swingAngle >= this.stats.swingRange) {
                this.isSwinging = false;
                this.rotation = 0;
                this.swingAngle = 0;
                this.sprite.visible = false;
                this.hitEntities.clear();
            } else {
                this.checkHits(targets, prevAngle);
            }
        }
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;
        return Math.min(1, timeSinceLastSwing / this.stats.attackSpeed);
    }

    public setBladeLength(length: number): void {
        this.stats.bladeLength = length;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }
}

// Enhanced Master of Arms Spear
export class MasterSpear extends Spear {
    private static readonly MASTER_PARAMS: WeaponStats = {
        damage: 25, // Increased from 15
        knockback: 6, // Increased from 4
        attackSpeed: 900, // Faster than enemy spear (1200)
        range: 180, // Increased from 150
        swingSpeed: 0.3, // Faster thrust
        swingRange: Math.PI * 0, // Still no variance for thrust
        bladeLength: 140, // Longer than enemy spear (90)
        bladeWidth: 6, // Slightly thicker
        swingInfluence: 0.9,
        color: 0xFFD700, // Gold color
        optimalRange: 0.95,
        retreatRange: 0.6,
        windUpTime: 300, // Faster than enemy spear (400)
        previewAlpha: 0.4,
        swingSound: 'master_spear',
        projectileStats: {
            speed: 0,
            damage: 0,
            knockback: 0,
            size: 0,
            color: 0xFFD700,
            lifetime: 0,
            maxRange: 0
        }
    };

    constructor(owner: Entity) {
        super(owner, true);
        this.stats = MasterSpear.MASTER_PARAMS;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }

    public setBladeLength(length: number): void {
        this.stats.bladeLength = length;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }
}

// Enhanced Master of Arms Dagger
export class MasterDagger extends Dagger {
    private static readonly MASTER_PARAMS: WeaponStats = {
        swingSpeed: 0.5, // Faster than enemy dagger
        swingRange: Math.PI * 0.9, // Slightly wider arc
        damage: 8, // More damage than enemy dagger
        knockback: 1,
        attackSpeed: 300, // lightning fast
        bladeLength: 65, // Way longer
        bladeWidth: 5,
        swingInfluence: 0.3,
        color: 0xFFD700, // Gold color
        optimalRange: 0.95,
        retreatRange: 0.8,
        windUpTime: 80, // Faster windup
        previewAlpha: 0.4,
        swingSound: 'master_dagger',
        range: 35,
        projectileStats: {
            speed: 0,
            damage: 0,
            knockback: 0,
            size: 0,
            color: 0xFFD700,
            lifetime: 0,
            maxRange: 0
        }
    };

    constructor(owner: Entity) {
        super(owner, true);
        this.stats = MasterDagger.MASTER_PARAMS;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;
        return Math.min(1, timeSinceLastSwing / this.stats.attackSpeed);
    }

    public setBladeLength(length: number): void {
        this.stats.bladeLength = length;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }
}

// Enhanced Master of Arms Boomerang
export class MasterBoomerang extends Boomerang {
    private static readonly MASTER_PARAMS: RangedWeaponStats = {
        swingSpeed: 0,
        swingRange: 0,
        damage: 0,
        knockback: 0,
        attackSpeed: 200, // master of arms throws rapidly
        bladeLength: 12,
        bladeWidth: 5,
        swingInfluence: 0,
        color: 0xFFD700, // Gold color
        optimalRange: 35,
        retreatRange: 20,
        windUpTime: 50,
        previewAlpha: 0.4,
        swingSound: 'master_boomerang',
        range: 350,
        projectileStats: {
            speed: 6.5, // Faster than enemy boomerang
            damage: 12, // More damage
            knockback: 3,
            size: 16, // much larger
            color: 0xFFD700, // Gold color
            lifetime: 3000,
            maxRange: 500 // Longer range before return
        }
    };

    constructor(owner: Entity) {
        super(owner, true);
        this.stats = MasterBoomerang.MASTER_PARAMS;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;
        return Math.min(1, timeSinceLastSwing / this.stats.attackSpeed);
    }

    public setBladeLength(length: number): void {
        this.stats.bladeLength = length;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }
} 