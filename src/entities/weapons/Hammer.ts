// @ts-ignore - PIXI is required for inheritance
// PIXI import needed as this class extends BaseWeapon which extends PIXI.Container
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class Hammer extends BaseWeapon {
    private static readonly PLAYER_PARAMS: WeaponStats = {
        damage: 30,
        knockback: 15,
        attackSpeed: 1500, // Slower than sword
        range: 120, // Increased range for hammer
        swingSpeed: 0.15,
        swingRange: Math.PI * 1.2, // Wider swing
        bladeLength: 75, // Longer than sword
        bladeWidth: 8, // Thicker than sword
        swingInfluence: 0.8,
        color: 0x666666,
        optimalRange: 0.8,
        retreatRange: 0.6,
        windUpTime: 500, // Longer windup for telegraphing
        previewAlpha: 0.3,
        projectileStats: {
            speed: 0,
            damage: 0,
            knockback: 0,
            size: 0,
            color: 0x666666,
            lifetime: 0,
            maxRange: 0
        }
    };

    private static readonly ENEMY_PARAMS: WeaponStats = {
        damage: 20,
        knockback: 12,
        attackSpeed: 2000, // Even slower for enemies
        range: 100, 
        swingSpeed: 0.2,
        swingRange: Math.PI * 1.2,
        bladeLength: 75,
        bladeWidth: 8,
        swingInfluence: 0.8,
        color: 0x444444,
        optimalRange: 1.5,
        retreatRange: 0.6,
        windUpTime: 800, // Even longer windup for enemies
        previewAlpha: 0.3,
        projectileStats: {
            speed: 0,
            damage: 0,
            knockback: 0,
            size: 0,
            color: 0x444444,
            lifetime: 0,
            maxRange: 0
        }
    };

    constructor(owner: Entity, isEnemy: boolean = false) {
        const params = isEnemy ? Hammer.ENEMY_PARAMS : Hammer.PLAYER_PARAMS;
        console.log(`[Hammer] Initializing with params:
            isEnemy: ${isEnemy}
            bladeLength: ${params.bladeLength}
            optimalRange: ${params.optimalRange}
            retreatRange: ${params.retreatRange}`);
        super(owner, params, isEnemy);
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        // Draw handle
        this.sprite.beginFill(0x444444);
        this.sprite.drawRect(0, -2, this.stats.bladeLength * 0.7, 4);
        this.sprite.endFill();
        // Draw hammer head
        this.sprite.beginFill(this.stats.color);
        this.sprite.drawRect(
            this.stats.bladeLength * 0.7,
            -this.stats.bladeWidth,
            this.stats.bladeLength * 0.3,
            this.stats.bladeWidth * 2
        );
        this.sprite.endFill();
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        // Draw handle
        this.previewSprite.beginFill(0x444444);
        this.previewSprite.drawRect(0, -2, this.stats.bladeLength * 0.7, 4);
        this.previewSprite.endFill();
        // Draw hammer head
        this.previewSprite.beginFill(this.stats.color);
        this.previewSprite.drawRect(
            this.stats.bladeLength * 0.7,
            -this.stats.bladeWidth,
            this.stats.bladeLength * 0.3,
            this.stats.bladeWidth * 2
        );
        this.previewSprite.endFill();
        this.previewSprite.alpha = this.stats.previewAlpha;
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