// @ts-ignore - PIXI is required for inheritance
// PIXI import needed as this class extends BaseWeapon which extends PIXI.Container
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { RangedWeapon, RangedWeaponStats } from './RangedWeapon';
import { BoomerangProjectile } from '../projectiles/BoomerangProjectile';

export class Boomerang extends RangedWeapon {
    private static readonly PLAYER_PARAMS: RangedWeaponStats = {
        swingSpeed: 0,  // Not used for boomerang
        swingRange: 0,  // Not used for boomerang
        damage: 0,      // Damage is in projectile
        knockback: 0,   // Knockback is in projectile
        attackSpeed: 2000, // Time between throws
        bladeLength: 10,  // Visual size of boomerang
        bladeWidth: 4,
        swingInfluence: 0,
        color: 0x8B4513,  // Wooden color
        optimalRange: 20,
        retreatRange: 5,
        windUpTime: 400,
        previewAlpha: 0.4,
        range: 300,
        projectileStats: {
            speed: 2,
            damage: 8,
            knockback: 2,
            size: 12,
            color: 0x8B4513,
            lifetime: 3000, // 3 seconds max flight time
            maxRange: 350  // Distance before returning
        }
    };

    private static readonly ENEMY_PARAMS: RangedWeaponStats = {
        ...Boomerang.PLAYER_PARAMS,
        attackSpeed: 3000,  // Slower attack speed for enemies
        windUpTime: 800,   // Longer wind-up for telegraphing
        projectileStats: {
            ...Boomerang.PLAYER_PARAMS.projectileStats,
            damage: 6,     // Less damage
            knockback: 1.5,
            speed: 5      // Slightly slower
        }
    };

    constructor(owner: Entity, isEnemy: boolean = false) {
        super(owner, isEnemy ? Boomerang.ENEMY_PARAMS : Boomerang.PLAYER_PARAMS, isEnemy);
    }

    protected createProjectile(startPos: { x: number, y: number }, direction: { x: number, y: number }): BoomerangProjectile {
        // Calculate angle from direction
        const angle = Math.atan2(direction.y, direction.x);
        
        return new BoomerangProjectile(
            startPos.x,
            startPos.y,
            angle,
            this.owner.parent.getBounds(),
            this.owner,
            this.stats.projectileStats,
            this.isEnemy
        );
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        
        // Draw boomerang shape
        this.sprite.lineStyle(this.stats.bladeWidth, this.stats.color);
        
        // Draw the L shape of the boomerang
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(this.stats.bladeLength, 0);
        this.sprite.lineTo(this.stats.bladeLength, this.stats.bladeLength);
        
        // Add some detail lines
        this.sprite.lineStyle(1, this.stats.color);
        this.sprite.moveTo(this.stats.bladeLength * 0.2, 0);
        this.sprite.lineTo(this.stats.bladeLength * 0.2, this.stats.bladeLength * 0.8);
        this.sprite.moveTo(this.stats.bladeLength * 0.4, 0);
        this.sprite.lineTo(this.stats.bladeLength * 0.4, this.stats.bladeLength * 0.6);
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        
        // Draw boomerang shape with preview alpha
        this.previewSprite.lineStyle(this.stats.bladeWidth, this.stats.color, this.stats.previewAlpha);
        
        // Draw the L shape of the boomerang
        this.previewSprite.moveTo(0, 0);
        this.previewSprite.lineTo(this.stats.bladeLength, 0);
        this.previewSprite.lineTo(this.stats.bladeLength, this.stats.bladeLength);
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