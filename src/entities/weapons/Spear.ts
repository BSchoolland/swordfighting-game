// TODO: Investigate if PIXI import is needed due to inheritance from BaseWeapon
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';

export class Spear extends BaseWeapon {
    private static readonly PLAYER_PARAMS: WeaponStats = {
        damage: 25,
        knockback: 8,
        attackSpeed: 800,
        range: 80, // Longer range than sword
        swingSpeed: 0.3,
        swingRange: Math.PI * 0, // no variance
        bladeLength: 120, // Longer than sword
        bladeWidth: 3, // Thinner than sword
        swingInfluence: 0.8, // More forward momentum
        color: 0x888888,
        optimalRange: 0.9, // Needs to be at tip for max damage
        retreatRange: 0.5,
        windUpTime: 400,
        previewAlpha: 0.3
    };

    private static readonly ENEMY_PARAMS: WeaponStats = {
        damage: 10,
        knockback: 6, 
        attackSpeed: 1200, // Slower than sword
        range: 130,
        swingSpeed: 0.25,
        swingRange: Math.PI * 0, // no variance
        bladeLength: 90,
        bladeWidth: 3,
        swingInfluence: 0.8,
        color: 0xaa4444,
        optimalRange: 0.9,
        retreatRange: 0.5,
        windUpTime: 400, // Longer windup for telegraphing
        previewAlpha: 0.3
    };

    private readonly THRUST_DISTANCE = 30; // How far the spear moves forward during thrust
    private readonly THRUST_DURATION = Math.PI; // Full thrust cycle in radians

    constructor(owner: Entity, isEnemy: boolean = false) {
        super(owner, isEnemy ? Spear.ENEMY_PARAMS : Spear.PLAYER_PARAMS, isEnemy);
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        
        // Draw shaft
        this.sprite.lineStyle(this.stats.bladeWidth * 0.8, 0x654321);
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(this.stats.bladeLength * 0.7, 0);
        
        // Draw spearhead
        this.sprite.lineStyle(this.stats.bladeWidth, this.stats.color);
        this.sprite.moveTo(this.stats.bladeLength * 0.7, 0);
        this.sprite.lineTo(this.stats.bladeLength, 0);
        
        // Draw spearhead details
        this.sprite.lineStyle(this.stats.bladeWidth * 0.5, this.stats.color);
        this.sprite.moveTo(this.stats.bladeLength * 0.7, -this.stats.bladeWidth);
        this.sprite.lineTo(this.stats.bladeLength * 0.85, 0);
        this.sprite.lineTo(this.stats.bladeLength * 0.7, this.stats.bladeWidth);
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        
        // Draw shaft preview
        this.previewSprite.lineStyle(this.stats.bladeWidth * 0.8, 0x654321, this.stats.previewAlpha);
        this.previewSprite.moveTo(0, 0);
        this.previewSprite.lineTo(this.stats.bladeLength * 0.7, 0);
        
        // Draw spearhead preview
        this.previewSprite.lineStyle(this.stats.bladeWidth, this.stats.color, this.stats.previewAlpha);
        this.previewSprite.moveTo(this.stats.bladeLength * 0.7, 0);
        this.previewSprite.lineTo(this.stats.bladeLength, 0);
    }

    public update(_delta: number, targets: Entity[] = []): void {
        if (this.isWindingUp) {
            const currentTime = Date.now();
            const elapsedWindUpTime = currentTime - this.windUpStartTime;
            const remainingWindUp = this.stats.windUpTime - elapsedWindUpTime;
            
            // Pull back slightly during windup
            this.x = -5;
            
            if (remainingWindUp <= 0) {
                this.isWindingUp = false;
                this.isSwinging = true;
                this.previewSprite.visible = false;
                this.sprite.visible = true;
                this.swingAngle = 0;
            }
        }

        if (this.isSwinging) {
            // Progress through the thrust motion
            this.swingAngle += this.stats.swingSpeed;
            
            // Calculate thrust position - forward then back
            const thrustProgress = Math.min(this.swingAngle / this.THRUST_DURATION, 1);
            const thrustOffset = Math.sin(thrustProgress * Math.PI) * this.THRUST_DISTANCE;
            this.x = thrustOffset;

            if (thrustProgress >= 0.5 && targets.length > 0) {
                this.checkStabHits(targets);
            }

            if (thrustProgress >= 1) {
                this.isSwinging = false;
                this.x = 0;
                this.swingAngle = 0;
                this.sprite.visible = false;
                this.hitEntities.clear();
            }
        }
    }

    protected checkStabHits(targets: Entity[]): void {
        targets.forEach(target => {
            if (target === this.owner || !target.isAlive() || this.hitEntities.has(target)) return;

            const dx = target.x - this.owner.x;
            const dy = target.y - this.owner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if target is in range considering the thrust
            if (distance <= this.stats.bladeLength + this.THRUST_DISTANCE) {
                // Get angle to target relative to world coordinates
                const angleToTarget = Math.atan2(dy, dx);
                
                // Get the weapon's world angle
                const weaponWorldAngle = this.owner.rotation;
                
                // Normalize angles to [-PI, PI] range
                const normalizedWeaponAngle = ((weaponWorldAngle % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
                const normalizedTargetAngle = ((angleToTarget % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
                
                // Calculate the absolute angular difference
                let angleDiff = Math.abs(normalizedWeaponAngle - normalizedTargetAngle);
                if (angleDiff > Math.PI) {
                    angleDiff = 2 * Math.PI - angleDiff;
                }

                // Much narrower hit arc for stabbing
                if (angleDiff < Math.PI/16) {  // 22.5 degree arc
                    const knockbackDir = {
                        x: dx / distance,
                        y: dy / distance
                    };
                    
                    target.takeDamage(this.stats.damage, knockbackDir, this.stats.knockback);
                    this.hitEntities.add(target);
                }
            }
        });
    }

    public static setPlayerParam(param: keyof WeaponStats, value: number): void {
        Spear.PLAYER_PARAMS[param] = value;
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