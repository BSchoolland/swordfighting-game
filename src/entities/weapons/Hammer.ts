import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class Hammer extends BaseWeapon {
    private static readonly ENEMY_PARAMS: WeaponStats = {
        swingSpeed: 0.15, // Slower swing
        swingRange: Math.PI * 0.6, // Smaller arc but powerful
        damage: 25, // High damage
        knockback: 8, // Strong knockback
        attackSpeed: 2500, // Slow attack speed
        bladeLength: 60,
        bladeWidth: 8, // Thicker weapon
        swingInfluence: 0.7, // Strong swing influence
        color: 0x666666,
        optimalRange: 0.8,
        retreatRange: 0.6,
        windUpTime: 750, // Long wind-up
        previewAlpha: 0.4,
        range: 45
    };

    constructor(owner: Entity, isEnemy: boolean = true) {
        super(owner, Hammer.ENEMY_PARAMS, isEnemy);
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
} 