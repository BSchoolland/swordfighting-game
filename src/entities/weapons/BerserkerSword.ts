import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class BerserkerSword extends BaseWeapon {
    private static readonly ENEMY_PARAMS: WeaponStats = {
        damage: 15,
        knockback: 5,
        attackSpeed: 1200, // Slightly slower than basic sword
        range: 50, // Longer range
        swingSpeed: 0.18,
        swingRange: Math.PI * 1.3, // Wider swing
        bladeLength: 70, // Much longer blade
        bladeWidth: 6, // Thicker blade
        swingInfluence: 0.6,
        color: 0xff3300, // Fiery orange-red
        optimalRange: 0.8,
        retreatRange: 0.6,
        windUpTime: 400, // Longer windup due to bigger sword
        previewAlpha: 0.3
    };

    constructor(owner: Entity, isEnemy: boolean = true) {
        super(owner, BerserkerSword.ENEMY_PARAMS, isEnemy);
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        
        // Draw the blade
        this.sprite.lineStyle(this.stats.bladeWidth, this.stats.color);
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(this.stats.bladeLength, 0);
        
        // Add some decorative details to make it look more menacing
        this.sprite.lineStyle(this.stats.bladeWidth/2, this.stats.color);
        // Cross guard
        this.sprite.moveTo(10, -8);
        this.sprite.lineTo(10, 8);
        // Diagonal details on the blade
        this.sprite.moveTo(20, -2);
        this.sprite.lineTo(40, -4);
        this.sprite.moveTo(20, 2);
        this.sprite.lineTo(40, 4);
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        
        // Draw the blade preview
        this.previewSprite.lineStyle(this.stats.bladeWidth, this.stats.color, this.stats.previewAlpha);
        this.previewSprite.moveTo(0, 0);
        this.previewSprite.lineTo(this.stats.bladeLength, 0);
        
        // Add the decorative details to the preview
        this.previewSprite.lineStyle(this.stats.bladeWidth/2, this.stats.color, this.stats.previewAlpha);
        // Cross guard
        this.previewSprite.moveTo(10, -8);
        this.previewSprite.lineTo(10, 8);
        // Diagonal details
        this.previewSprite.moveTo(20, -2);
        this.previewSprite.lineTo(40, -4);
        this.previewSprite.moveTo(20, 2);
        this.previewSprite.lineTo(40, 4);
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;
        return Math.min(1, timeSinceLastSwing / this.stats.attackSpeed);
    }
} 