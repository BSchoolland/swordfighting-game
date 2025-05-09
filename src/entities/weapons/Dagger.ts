// @ts-ignore - PIXI is required for inheritance
// PIXI import needed as this class extends BaseWeapon which extends PIXI.Container
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class Dagger extends BaseWeapon {
    private static readonly ENEMY_PARAMS: WeaponStats = {
        swingSpeed: 0.4,
        swingRange: Math.PI * 0.8, // Smaller arc
        damage: 5, // Less damage
        knockback: 0,
        attackSpeed: 800, // Faster attack speed
        bladeLength: 30, // Shorter range
        bladeWidth: 2,
        swingInfluence: 0.2,
        color: 0xFFAA00,
        optimalRange: 0.9,
        retreatRange: 0.7,
        windUpTime: 100, // Quick wind-up
        previewAlpha: 0.3,
        range: 30,
        projectileStats: {
            speed: 0,
            damage: 0,
            knockback: 0,
            size: 0,
            color: 0xFFAA00,
            lifetime: 0,
            maxRange: 0
        }
    };

    constructor(owner: Entity, isEnemy: boolean = true) {
        super(owner, Dagger.ENEMY_PARAMS, isEnemy);
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        this.sprite.beginFill(this.stats.color);
        this.sprite.drawRect(0, -this.stats.bladeWidth/2, this.stats.bladeLength, this.stats.bladeWidth);
        this.sprite.endFill();
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        this.previewSprite.beginFill(this.stats.color);
        this.previewSprite.drawRect(0, -this.stats.bladeWidth/2, this.stats.bladeLength, this.stats.bladeWidth);
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