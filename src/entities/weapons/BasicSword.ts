// @ts-ignore - PIXI is required for inheritance
// PIXI import needed as this class extends BaseWeapon which extends PIXI.Container
// @ts-ignore - PIXI is required for inheritance
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';
import { Player } from '../Player';
import { ParticleSystem } from '../../effects/ParticleSystem';
import { SoundManager } from '../../systems/SoundManager';
import { GlowFilter } from '@pixi/filter-glow';


const BASE_PLAYER_PARAMS = {
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
        knockback: 1,
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

    private lastDashTime: number = 0;
    private static readonly DASH_DAMAGE_EXTENSION = 200; // 200ms extension for double damage after dash
    protected readonly TRAIL_INTERVAL = 16; // Collect points every ~16ms
    protected readonly DASH_TRAIL_INTERVAL = 8; // Collect points more frequently during dash

    public glowFilter: GlowFilter;

    constructor(owner: Entity, isEnemy: boolean = false) {
        super(owner, isEnemy ? BasicSword.ENEMY_PARAMS : BasicSword.PLAYER_PARAMS, isEnemy);
        // glow
        this.glowFilter = new GlowFilter({
            color: 0xffffff,
            distance: 30,
            outerStrength: 1,
            innerStrength: 0,
            quality: 1
        });
        this.filters = [this.glowFilter];
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        
        if (!this.isEnemy) {
            // Player sword with more interesting design
            let baseColor = this.stats.color;
            try {
                // Only check dashing if the player is fully initialized
                if (this.owner instanceof Player && (this.owner.isDashing() || this.isDuringDashDamageExtension())) {
                    baseColor = 0xff6600; // More orange color during dash
                }
            } catch (e) {
                // During initialization, just use the default color
                baseColor = this.stats.color;
            }
            
            // Draw the main blade
            this.sprite.lineStyle(this.stats.bladeWidth, baseColor);
            this.sprite.moveTo(0, 0);
            this.sprite.lineTo(this.stats.bladeLength, 0);
            
            // Enhanced decorative elements
            const glowColor = baseColor === 0xff6600 ? 0xffaa00 : 0xeeeeee; // Warmer glow during dash
            
            // Add a subtle glow effect
            this.sprite.lineStyle(this.stats.bladeWidth * 1.5, glowColor, 0.2);
            this.sprite.moveTo(0, 0);
            this.sprite.lineTo(this.stats.bladeLength, 0);
            
            // Draw the main blade again over the glow
            this.sprite.lineStyle(this.stats.bladeWidth, baseColor);
            this.sprite.moveTo(0, 0);
            this.sprite.lineTo(this.stats.bladeLength, 0);
            
            // Decorative cross guard
            this.sprite.lineStyle(this.stats.bladeWidth * 0.8, baseColor);
            // Main cross guard
            this.sprite.moveTo(8, -8);
            this.sprite.lineTo(8, 8);
            // Angled cross guard details
            this.sprite.moveTo(6, -6);
            this.sprite.lineTo(10, -6);
            this.sprite.moveTo(6, 6);
            this.sprite.lineTo(10, 6);
            
            // Blade fuller (groove) with gradient effect
            const fullerWidth = this.stats.bladeWidth * 0.4;
            // Outer fuller lines
            this.sprite.lineStyle(fullerWidth, baseColor, 0.6);
            this.sprite.moveTo(15, -1);
            this.sprite.lineTo(this.stats.bladeLength * 0.9, -1);
            this.sprite.moveTo(15, 1);
            this.sprite.lineTo(this.stats.bladeLength * 0.9, 1);
            // Center fuller line
            this.sprite.lineStyle(fullerWidth, baseColor, 0.3);
            this.sprite.moveTo(15, 0);
            this.sprite.lineTo(this.stats.bladeLength * 0.9, 0);
            
            // Add blade tip detail
            this.sprite.lineStyle(this.stats.bladeWidth * 0.6, baseColor);
            this.sprite.moveTo(this.stats.bladeLength - 10, -2);
            this.sprite.lineTo(this.stats.bladeLength, 0);
            this.sprite.lineTo(this.stats.bladeLength - 10, 2);
        } else {
            // Keep enemy sword simple
            this.sprite.lineStyle(this.stats.bladeWidth, this.stats.color);
            this.sprite.moveTo(0, 0);
            this.sprite.lineTo(this.stats.bladeLength, 0);
        }
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        
        if (!this.isEnemy) {
            // Player sword preview with more interesting design
            let baseColor = this.stats.color;
            try {
                // Only check dashing if the player is fully initialized
                if (this.owner instanceof Player && (this.owner.isDashing() || this.isDuringDashDamageExtension())) {
                    baseColor = 0xff6600; // More orange color during dash
                }
            } catch (e) {
                // During initialization, just use the default color
                baseColor = this.stats.color;
            }
            
            const glowColor = baseColor === 0xff6600 ? 0xffaa00 : 0xeeeeee; // Warmer glow during dash
            
            // Add a subtle glow effect
            this.previewSprite.lineStyle(this.stats.bladeWidth * 1.5, glowColor, 0.2 * this.stats.previewAlpha);
            this.previewSprite.moveTo(0, 0);
            this.previewSprite.lineTo(this.stats.bladeLength, 0);
            
            // Draw the main blade preview
            this.previewSprite.lineStyle(this.stats.bladeWidth, baseColor, this.stats.previewAlpha);
            this.previewSprite.moveTo(0, 0);
            this.previewSprite.lineTo(this.stats.bladeLength, 0);
            
            // Decorative cross guard
            this.previewSprite.lineStyle(this.stats.bladeWidth * 0.8, baseColor, this.stats.previewAlpha);
            // Main cross guard
            this.previewSprite.moveTo(8, -8);
            this.previewSprite.lineTo(8, 8);
            // Angled cross guard details
            this.previewSprite.moveTo(6, -6);
            this.previewSprite.lineTo(10, -6);
            this.previewSprite.moveTo(6, 6);
            this.previewSprite.lineTo(10, 6);
            
            // Blade fuller (groove) with gradient effect
            const fullerWidth = this.stats.bladeWidth * 0.4;
            // Outer fuller lines
            this.previewSprite.lineStyle(fullerWidth, baseColor, 0.6 * this.stats.previewAlpha);
            this.previewSprite.moveTo(15, -1);
            this.previewSprite.lineTo(this.stats.bladeLength * 0.9, -1);
            this.previewSprite.moveTo(15, 1);
            this.previewSprite.lineTo(this.stats.bladeLength * 0.9, 1);
            // Center fuller line
            this.previewSprite.lineStyle(fullerWidth, baseColor, 0.3 * this.stats.previewAlpha);
            this.previewSprite.moveTo(15, 0);
            this.previewSprite.lineTo(this.stats.bladeLength * 0.9, 0);
            
            // Add blade tip detail
            this.previewSprite.lineStyle(this.stats.bladeWidth * 0.6, baseColor, this.stats.previewAlpha);
            this.previewSprite.moveTo(this.stats.bladeLength - 10, -2);
            this.previewSprite.lineTo(this.stats.bladeLength, 0);
            this.previewSprite.lineTo(this.stats.bladeLength - 10, 2);
        } else {
            // Keep enemy sword preview simple
            this.previewSprite.lineStyle(this.stats.bladeWidth, this.stats.color, this.stats.previewAlpha);
            this.previewSprite.moveTo(0, 0);
            this.previewSprite.lineTo(this.stats.bladeLength, 0);
        }
    }

    public static setPlayerParam(param: keyof WeaponStats, value: number): void {
        BasicSword.PLAYER_PARAMS[param] = value;
    }

    public setBladeLength(length: number): void {
        this.stats.bladeLength = length;
        this.drawWeapon();
        this.drawPreviewWeapon();
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;
        return Math.min(1, timeSinceLastSwing / this.stats.attackSpeed);
    }

    public swing(): void {
        super.swing(); // Use BaseWeapon's swing logic
    }

    public reset(): void {
        // reset to base params
        this.stats = { ...BASE_PLAYER_PARAMS };
        this.drawWeapon();
        this.drawPreviewWeapon();
    }

    public setSwingSpeedMultiplier(multiplier: number): void {
        console.log(`Setting swing speed multiplier to ${multiplier}`);
        this.stats.swingSpeed = this.stats.swingSpeed * multiplier;
        this.stats.attackSpeed = this.stats.attackSpeed / multiplier;
        console.log(`Attack speed: ${this.stats.attackSpeed}`);
        // this.drawWeapon();
        // this.drawPreviewWeapon();
    }

    public update(delta: number, targets: Entity[]): void {
        if (this.owner instanceof Player) {
            if (this.owner.isDashing()) {
                this.lastDashTime = Date.now();
                this.stats.color = 0xff6600;
            } else if (this.isDuringDashDamageExtension()) {
            this.stats.color = 0xff6600;
            } else {
                this.stats.color = 0xcccccc;
            }
        }

        super.update(delta, targets);
        
        

        
        
        // Redraw the weapon if it's visible to update the color
        if (this.sprite.visible || this.previewSprite.visible) {
            this.drawWeapon();
            this.drawPreviewWeapon();
        }
    }

    private isDuringDashDamageExtension(): boolean {
        return Date.now() - this.lastDashTime < BasicSword.DASH_DAMAGE_EXTENSION;
    }

    protected checkHits(targets: Entity[]): void {
        // Override to apply double damage during dash extension
        targets.forEach(target => {
            if (target === this.owner || !target.isAlive() || this.hitEntities.has(target)) return;

            const dx = target.x - this.owner.x;
            const dy = target.y - this.owner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const effectiveRange = this.stats.bladeLength + target.getRadius();
            
            if (distance < effectiveRange) {
                const angleToTarget = Math.atan2(dy, dx);
                const weaponWorldAngle = this.rotation + this.owner.rotation;
                
                const normalizedWeaponAngle = ((weaponWorldAngle % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
                const normalizedTargetAngle = ((angleToTarget % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
                
                let angleDiff = Math.abs(normalizedWeaponAngle - normalizedTargetAngle);
                if (angleDiff > Math.PI) {
                    angleDiff = 2 * Math.PI - angleDiff;
                }

                const baseHitArc = Math.PI/3;
                const sizeMultiplier = target.getRadius() / 10;
                const adjustedHitArc = baseHitArc * Math.min(2, Math.max(1, sizeMultiplier));

                if (angleDiff < adjustedHitArc) {
                    const knockbackDir = {
                        x: dx / distance,
                        y: dy / distance
                    };
                    
                    let damage = this.stats.damage;
                    let knockback = this.stats.knockback;
                    let shouldFreezeFrame = false;

                    // Apply double damage during dash or dash extension
                    if (this.owner instanceof Player && 
                        (this.owner.isDashing() || this.isDuringDashDamageExtension())) {
                        damage *= 2;
                        knockback *= 2;
                        shouldFreezeFrame = true;
                    }

                    damage *= this.damageMultiplier;
                    
                    target.takeDamage(damage, knockbackDir, knockback);
                    this.hitEntities.add(target);

                    if (this.owner instanceof Player) {
                        if (this.owner.isDashing() || this.isDuringDashDamageExtension()) {
                            SoundManager.getInstance().playCriticalHitSound();
                        } else {
                            SoundManager.getInstance().playHitSound();
                        }
                        ParticleSystem.getInstance().createHitSparks(target.x, target.y, 
                            this.owner.isDashing() || this.isDuringDashDamageExtension() ? 0xff6600 : this.stats.color);
                    }
                    
                    const gameScene = this.parent?.parent as any;
                    if (gameScene && gameScene.handleHit) {
                        gameScene.handleHit(target, this);
                    }

                    if (shouldFreezeFrame && gameScene) {
                        gameScene.freezeFrameTimer = gameScene.constructor.FREEZE_FRAME_DURATION;
                    }
                }
            }
        });
    }
} 