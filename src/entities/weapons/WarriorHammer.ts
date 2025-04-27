// @ts-ignore - PIXI is required for inheritance
// PIXI import needed as this class extends BaseWeapon which extends PIXI.Container
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class WarriorHammer extends BaseWeapon {
    private static readonly PLAYER_PARAMS: WeaponStats = {
        damage: 30,
        knockback: 15,
        attackSpeed: 2000, // Slower than sword
        range: 100, // Increased range for hammer
        swingSpeed: 0.15,
        swingRange: Math.PI * 1.2, // Wider swing
        bladeLength: 90, // Longer than sword
        bladeWidth: 12, // Thicker than sword
        swingInfluence: 0.8,
        color: 0xcc0000,
        optimalRange: 0.8,
        retreatRange: 0.4,
        windUpTime: 600, // Longer windup for telegraphing
        previewAlpha: 0.3
    };

    private static readonly ENEMY_PARAMS: WeaponStats = {
        damage: 20,
        knockback: 12,
        attackSpeed: 5000, // Even slower for enemies
        range: 100, 
        swingSpeed: 0.2,
        swingRange: Math.PI * 1.2,
        bladeLength: 75,
        bladeWidth: 8,
        swingInfluence: 0.8,
        color: 0xcc0000,
        optimalRange: 1.5,
        retreatRange: 0.6,
        windUpTime: 800, // Even longer windup for enemies
        previewAlpha: 0.3
    };

    constructor(owner: Entity, isEnemy: boolean = false) {
        const params = isEnemy ? WarriorHammer.ENEMY_PARAMS : WarriorHammer.PLAYER_PARAMS;
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
        this.sprite.drawRect(0, -2, this.stats.bladeLength * 0.9, 4);
        this.sprite.endFill();
        
        const headStart = this.stats.bladeLength * 0.65;
        const headLength = this.stats.bladeLength * 0.35;
        const headWidth = this.stats.bladeWidth * 3;
        
        // Draw hammer head with wider ends
        this.sprite.beginFill(this.stats.color);
        
        // Draw the hammer head with a pinched middle
        this.sprite.moveTo(headStart, -headWidth * 0.5);                       // Top left
        this.sprite.lineTo(headStart + headLength, -headWidth * 0.6);          // Top right (wider)
        this.sprite.lineTo(headStart + headLength, headWidth * 0.6);           // Bottom right (wider)
        this.sprite.lineTo(headStart, headWidth * 0.5);                        // Bottom left
        this.sprite.lineTo(headStart + headLength * 0.5, headWidth * 0.3);     // Pinch in middle bottom
        this.sprite.lineTo(headStart + headLength * 0.5, -headWidth * 0.3);    // Pinch in middle top
        this.sprite.lineTo(headStart, -headWidth * 0.5);                       // Back to start
        
        this.sprite.endFill();
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        
        // Draw handle
        this.previewSprite.beginFill(0x444444);
        this.previewSprite.drawRect(0, -2, this.stats.bladeLength * 0.9, 4);
        this.previewSprite.endFill();
        
        const headStart = this.stats.bladeLength * 0.65;
        const headLength = this.stats.bladeLength * 0.35;
        const headWidth = this.stats.bladeWidth * 3;
        
        // Draw hammer head with wider ends
        this.previewSprite.beginFill(this.stats.color);
        
        // Draw the hammer head with a pinched middle
        this.previewSprite.moveTo(headStart, -headWidth * 0.5);                // Top left
        this.previewSprite.lineTo(headStart + headLength, -headWidth * 0.6);   // Top right (wider)
        this.previewSprite.lineTo(headStart + headLength, headWidth * 0.6);    // Bottom right (wider)
        this.previewSprite.lineTo(headStart, headWidth * 0.5);                 // Bottom left
        this.previewSprite.lineTo(headStart + headLength * 0.5, headWidth * 0.3); // Pinch in middle bottom
        this.previewSprite.lineTo(headStart + headLength * 0.5, -headWidth * 0.3); // Pinch in middle top
        this.previewSprite.lineTo(headStart, -headWidth * 0.5);                // Back to start
        
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