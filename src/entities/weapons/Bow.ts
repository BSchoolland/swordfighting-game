import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { RangedWeapon, RangedWeaponStats } from './RangedWeapon';
import { Arrow } from '../projectiles/Arrow';

export class Bow extends RangedWeapon {
    private static readonly PLAYER_PARAMS: RangedWeaponStats = {
        swingSpeed: 0,  // Not used for bow
        swingRange: 0,  // Not used for bow
        damage: 0,      // Damage is in projectile
        knockback: 0,   // Knockback is in projectile
        attackSpeed: 3000, // Time between shots
        bladeLength: 30,  // Reduced from 40 to position bow closer to owner
        bladeWidth: 3,
        swingInfluence: 0,
        color: 0xA0522D,  // Brown color
        optimalRange: 1.5,
        retreatRange: 0.2,
        windUpTime: 700,
        previewAlpha: 0.4,
        range: 400,
        projectileStats: {
            speed: 4,     // Reduced from 12 to make arrows fly slower
            damage: 10,
            knockback: 3,
            size: 4,
            color: 0xCCCCCC,
            lifetime: 2000
        }
    };

    private static readonly ENEMY_PARAMS: RangedWeaponStats = {
        ...Bow.PLAYER_PARAMS,
        attackSpeed: 3000,  // Slower attack speed
        windUpTime: 1000,   // Longer wind-up
        previewAlpha: 0.3,
        optimalRange: 7.5,  // Much further optimal range (150 units with bladeLength of 20)
        retreatRange: 6.0,  // Start retreating at 120 units
        projectileStats: {
            speed: 3,      // Reduced from 10 to make arrows fly slower
            damage: 8,      // Less damage
            knockback: 2,
            size: 4,
            color: 0xCCCCCC,
            lifetime: 2000
        }
    };

    constructor(owner: Entity, isEnemy: boolean = false) {
        super(owner, isEnemy ? Bow.ENEMY_PARAMS : Bow.PLAYER_PARAMS, isEnemy);
    }

    protected createProjectile(startPos: { x: number, y: number }, direction: { x: number, y: number }): Arrow {
        return new Arrow(this.owner.parent.getBounds(), this.owner, startPos, direction, this.isEnemy);
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        
        // Draw bow arc
        this.sprite.lineStyle(this.stats.bladeWidth, this.stats.color);
        this.sprite.arc(0, 0, this.stats.bladeLength, -Math.PI/6, Math.PI/6);
        
        // Draw bowstring
        this.sprite.lineStyle(1, 0xFFFFFF);
        this.sprite.moveTo(this.stats.bladeLength * Math.cos(-Math.PI/6), this.stats.bladeLength * Math.sin(-Math.PI/6));
        this.sprite.lineTo(this.stats.bladeLength * 0.8, 0);
        this.sprite.lineTo(this.stats.bladeLength * Math.cos(Math.PI/6), this.stats.bladeLength * Math.sin(Math.PI/6));
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        
        // Draw bow arc
        this.previewSprite.lineStyle(this.stats.bladeWidth, this.stats.color);
        this.previewSprite.arc(0, 0, this.stats.bladeLength, -Math.PI/6, Math.PI/6);
        
        // Draw bowstring
        this.previewSprite.lineStyle(1, 0xFFFFFF);
        this.previewSprite.moveTo(this.stats.bladeLength * Math.cos(-Math.PI/6), this.stats.bladeLength * Math.sin(-Math.PI/6));
        this.previewSprite.lineTo(this.stats.bladeLength * 0.8, 0);
        this.previewSprite.lineTo(this.stats.bladeLength * Math.cos(Math.PI/6), this.stats.bladeLength * Math.sin(Math.PI/6));
        
        this.previewSprite.alpha = this.stats.previewAlpha;
    }
} 