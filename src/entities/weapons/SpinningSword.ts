// @ts-ignore - PIXI is required for inheritance
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class SpinningSword extends BaseWeapon {
    private static readonly ENEMY_PARAMS: WeaponStats = {
        damage: 15,
        knockback: 3,
        attackSpeed: 1500, // Slower to balance the spinning attack
        range: 60,
        swingSpeed: 0.2, // Faster swing speed for spinning
        swingRange: Math.PI * 4, // Two full rotations (720 degrees)
        bladeLength: 70, // Longer than basic sword
        bladeWidth: 4,
        swingInfluence: 0.5,
        color: 0x00aaff, // Blue color
        optimalRange: 0.8,
        retreatRange: 0.6,
        windUpTime: 300,
        previewAlpha: 0.3,
        projectileStats: {
            speed: 0,
            damage: 0,
            knockback: 0,
            size: 0,
            color: 0x00aaff,
            lifetime: 0,
            maxRange: 0
        }
    };

    constructor(owner: Entity, isEnemy: boolean = true) {
        super(owner, SpinningSword.ENEMY_PARAMS, isEnemy);
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        
        // Draw the main blade
        this.sprite.lineStyle(this.stats.bladeWidth, this.stats.color);
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(this.stats.bladeLength, 0);
        
        // Add a subtle glow effect
        this.sprite.lineStyle(this.stats.bladeWidth * 1.5, this.stats.color, 0.2);
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(this.stats.bladeLength, 0);
        
        // Draw the main blade again over the glow
        this.sprite.lineStyle(this.stats.bladeWidth, this.stats.color);
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(this.stats.bladeLength, 0);
        
        // Decorative cross guard
        this.sprite.lineStyle(this.stats.bladeWidth * 0.8, this.stats.color);
        this.sprite.moveTo(8, -8);
        this.sprite.lineTo(8, 8);
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        
        // Draw the main blade preview
        this.previewSprite.lineStyle(this.stats.bladeWidth, this.stats.color, this.stats.previewAlpha);
        this.previewSprite.moveTo(0, 0);
        this.previewSprite.lineTo(this.stats.bladeLength, 0);
        
        // Add a subtle glow effect
        this.previewSprite.lineStyle(this.stats.bladeWidth * 1.5, this.stats.color, 0.2 * this.stats.previewAlpha);
        this.previewSprite.moveTo(0, 0);
        this.previewSprite.lineTo(this.stats.bladeLength, 0);
        
        // Decorative cross guard
        this.previewSprite.lineStyle(this.stats.bladeWidth * 0.8, this.stats.color, this.stats.previewAlpha);
        this.previewSprite.moveTo(8, -8);
        this.previewSprite.lineTo(8, 8);
    }

    public swing(): void {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;

        if (!this.isWindingUp && !this.isSwinging && timeSinceLastSwing >= this.stats.attackSpeed) {
            this.isWindingUp = true;
            this.windUpStartTime = currentTime;
            this.swingAngle = 0;
            
            this.rotation = -Math.PI;
            
            this.previewSprite.visible = true;
            this.lastSwingTime = currentTime;
            this.hitEntities.clear();
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
            this.rotation = -Math.PI + this.swingAngle;

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