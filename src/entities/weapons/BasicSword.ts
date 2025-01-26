import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class BasicSword extends BaseWeapon {
    private static readonly PLAYER_PARAMS: WeaponStats = {
        swingSpeed: 0.3,
        swingRange: Math.PI * 1.5, // 270 degrees
        damage: 15,
        knockback: 5,
        attackSpeed: 1000,
        bladeLength: 60,
        bladeWidth: 4,
        swingInfluence: 0.5,
        color: 0xFFFFFF,
        optimalRange: 0.8,
        retreatRange: 0.6,
        windUpTime: 100,
        previewAlpha: 0.4,
        range: 60 // Same as bladeLength
    };

    private static readonly ENEMY_PARAMS: WeaponStats = {
        swingSpeed: 0.2,
        swingRange: Math.PI * 1.2,
        damage: 10,
        knockback: 3,
        attackSpeed: 2000,
        bladeLength: 40,
        bladeWidth: 3,
        swingInfluence: 0.3,
        color: 0xFF6666,
        optimalRange: 0.9,
        retreatRange: 0.7,
        windUpTime: 300,
        previewAlpha: 0.3,
        range: 40 // Same as bladeLength
    };

    constructor(owner: Entity, isEnemy: boolean = false) {
        super(owner, isEnemy ? BasicSword.ENEMY_PARAMS : BasicSword.PLAYER_PARAMS, isEnemy);
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

    // Method to modify sword parameters at runtime if needed
    public static setParam(param: keyof WeaponStats, value: number): void {
        BasicSword.PLAYER_PARAMS[param] = value;
    }
} 