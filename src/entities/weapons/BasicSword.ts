import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class BasicSword extends BaseWeapon {
    private static readonly PLAYER_PARAMS: WeaponStats = {
        damage: 20,
        knockback: 5,
        attackSpeed: 1000, 
        range: 40,
        swingSpeed: 0.2,
        swingRange: Math.PI * 1.2,
        bladeLength: 60,
        bladeWidth: 4,
        swingInfluence: 0.5,
        color: 0xcccccc,
        optimalRange: 0.8,
        retreatRange: 0.6,
        windUpTime: 100,
        previewAlpha: 0.3
    };

    private static readonly ENEMY_PARAMS: WeaponStats = {
        damage: 10,
        knockback: 10,
        attackSpeed: 1000, // 1 second between swings
        range: 40,
        swingSpeed: 0.15,
        swingRange: Math.PI,
        bladeLength: 40,
        bladeWidth: 4,
        swingInfluence: 0.5,
        color: 0xff0000,
        optimalRange: 0.8,
        retreatRange: 0.6,
        windUpTime: 300,
        previewAlpha: 0.3
    };

    constructor(owner: Entity, isEnemy: boolean = false) {
        super(owner, isEnemy ? BasicSword.ENEMY_PARAMS : BasicSword.PLAYER_PARAMS, isEnemy);
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        this.sprite.lineStyle(this.stats.bladeWidth, this.stats.color);
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(this.stats.bladeLength, 0);
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        this.previewSprite.lineStyle(this.stats.bladeWidth, this.stats.color, this.stats.previewAlpha);
        this.previewSprite.moveTo(0, 0);
        this.previewSprite.lineTo(this.stats.bladeLength, 0);
    }

    public static setPlayerParam(param: keyof WeaponStats, value: number): void {
        BasicSword.PLAYER_PARAMS[param] = value;
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;
        return Math.min(1, timeSinceLastSwing / this.stats.attackSpeed);
    }

    public swing(): void {
        super.swing(); // Use BaseWeapon's swing logic
    }
} 