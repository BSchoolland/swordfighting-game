// @ts-ignore - PIXI is required for inheritance
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { Player } from '../Player';
import { ParticleSystem } from '../../effects/ParticleSystem';
import { SoundManager } from '../../systems/SoundManager';
import { ProjectileStats } from '../projectiles/Projectile';

export interface WeaponStats {
    projectileStats: ProjectileStats;
    damage: number;
    knockback: number;
    attackSpeed: number;
    range: number;
    swingSpeed: number;
    swingRange: number;
    bladeLength: number;
    bladeWidth: number;
    swingInfluence: number;
    color: number;
    optimalRange: number;
    retreatRange: number;
    windUpTime: number;
    previewAlpha: number;
    originalAttackSpeed?: number;
    originalWindUpTime?: number;
    swingSound?: string; // Optional sound effect for weapon swing
}

export abstract class BaseWeapon extends PIXI.Container {
    protected sprite: PIXI.Graphics;
    protected previewSprite: PIXI.Graphics;
    public isSwinging: boolean = false;
    public isWindingUp: boolean = false;
    protected swingAngle: number = 0;
    protected lastSwingTime: number = 0;
    protected windUpTimer: number = 0;
    protected hitEntities: Set<Entity> = new Set();
    protected owner: Entity;
    protected isEnemy: boolean;
    protected debugId: string;
    protected windUpStartTime: number = 0;
    protected stats: WeaponStats;
    protected swingDirection: number = 1; // 1 for right, -1 for left
    private static readonly COMBO_WINDOW = 1500; // 800ms window for combo
    protected trailPoints: Array<{x: number, y: number}> = [];
    protected lastTrailTime: number = 0;
    protected readonly TRAIL_INTERVAL = 16; // Collect points every ~16ms
    protected swingProgress: number = 0;
    protected windupTimer: number = 0;
    protected baseDamage: number;
    protected damageMultiplier: number = 1;
    protected swingSpeedMultiplier: number = 1;

    constructor(owner: Entity, stats: WeaponStats, isEnemy: boolean = false) {
        super();
        this.owner = owner;
        this.stats = stats;
        // Store original timing values
        this.stats.originalAttackSpeed = stats.attackSpeed;
        this.stats.originalWindUpTime = stats.windUpTime;
        this.isEnemy = isEnemy;
        this.baseDamage = stats.damage;
        this.debugId = isEnemy ? `Enemy_${Math.floor(Math.random() * 1000)}` : 'Player';
        console.log(`[${this.debugId}] Weapon created`);

        // Create preview sprite
        this.previewSprite = new PIXI.Graphics();
        this.drawPreviewWeapon();
        this.addChild(this.previewSprite);
        this.previewSprite.visible = false;

        // Create main weapon sprite
        this.sprite = new PIXI.Graphics();
        this.drawWeapon();
        this.addChild(this.sprite);
        this.sprite.visible = false;
    }

    public getRange(): { attackRange: number, retreatRange: number } {
        // Use the explicit range parameter instead of calculating from bladeLength
        const attackRange = this.stats.range;
        const retreatRange = this.stats.range * (this.stats.retreatRange / this.stats.optimalRange);
        
        return {
            attackRange,
            retreatRange
        };
    }

    // Abstract methods grouped together
    protected abstract drawWeapon(): void;
    protected abstract drawPreviewWeapon(): void;
    public abstract getCooldownProgress(): number;
    public abstract setBladeLength(length: number): void;

    public isInWindUp(): boolean {
        return this.isWindingUp;
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
                
                // Play swing sound when the actual swing starts
                if (this.owner instanceof Player) {
                    SoundManager.getInstance().playSwingSound();
                }
            }
        }

        if (this.isSwinging) {
            const prevAngle = this.rotation;
            // Apply swing speed multiplier to the swing speed
            this.swingAngle += this.stats.swingSpeed * this.swingSpeedMultiplier;
            
            // Apply swing direction to the rotation
            if (this.swingDirection === 1) {
                // Swing right (original direction)
                this.rotation = -this.stats.swingRange/2 + this.swingAngle;
            } else {
                // Swing left (opposite direction)
                this.rotation = this.stats.swingRange/2 - this.swingAngle;
            }

            if (this.swingAngle <= this.stats.swingRange) {
                this.checkHits(targets, prevAngle);
            } else {
                this.isSwinging = false;
                this.rotation = 0;
                this.swingAngle = 0;
                this.sprite.visible = false;
                this.hitEntities.clear();
            }
        }

        // Reset swing direction if outside combo window
        const currentTime = Date.now();
        if (!this.isSwinging && !this.isWindingUp && 
            currentTime - this.lastSwingTime > BaseWeapon.COMBO_WINDOW) {
            this.swingDirection = 1;
        }

        // Track points for trail effect
        if (this.isSwinging) {
            if (currentTime - this.lastTrailTime >= this.TRAIL_INTERVAL) {
                const totalRotation = this.rotation + this.owner.rotation;
                
                // Calculate blade tip position relative to owner's world coordinates
                this.trailPoints.push({
                    x: this.owner.x + Math.cos(totalRotation) * this.stats.bladeLength,
                    y: this.owner.y + Math.sin(totalRotation) * this.stats.bladeLength
                });
                this.lastTrailTime = currentTime;

                // Create trail effect when we have enough points
                if (this.trailPoints.length >= 2) {
                    const intensity = this.isWindingUp ? 0.5 : 1.0;
                    ParticleSystem.getInstance().createWeaponTrail(this.trailPoints, this.stats.color, intensity);
                    this.trailPoints = [this.trailPoints[this.trailPoints.length - 1]]; // Keep last point
                }
            }
        } else {
            // Clear trail points when not swinging
            this.trailPoints = [];
        }
    }

    public swing(): void {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;

        if (!this.isWindingUp && !this.isSwinging && timeSinceLastSwing >= this.stats.attackSpeed) {
            this.isWindingUp = true;
            this.windUpStartTime = currentTime;
            this.swingAngle = 0;
            
            // Only alternate direction if within combo window
            if (timeSinceLastSwing <= BaseWeapon.COMBO_WINDOW) {
                this.swingDirection *= -1;
            } else {
                this.swingDirection = 1; // Reset to default direction
            }
            
            // Set initial rotation based on swing direction
            if (this.swingDirection === 1) {
                this.rotation = -this.stats.swingRange/2;
            } else {
                this.rotation = this.stats.swingRange/2;
            }
            
            this.previewSprite.visible = true;
            this.lastSwingTime = currentTime;
            this.hitEntities.clear();

            // Play weapon-specific swing sound if it exists
            if (this.stats.swingSound) {
                // wait the windup time
                setTimeout(() => {
                    if (this.stats.swingSound) {
                        SoundManager.getInstance().playSound(this.stats.swingSound);
                    }
                }, this.stats.windUpTime);
            }
        }
    }

    public isInSwing(): boolean {
        return this.isSwinging;
    }

    protected checkHits(targets: Entity[], _prevAngle: number): void {
        targets.forEach(target => {
            if (target === this.owner || !target.isAlive() || this.hitEntities.has(target)) return;

            const dx = target.x - this.owner.x;
            const dy = target.y - this.owner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Consider target's radius when checking distance
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

                // Adjust hit arc based on target size - larger enemies are easier to hit
                const baseHitArc = Math.PI/3;
                const sizeMultiplier = target.getRadius() / 10; // 10 is the default radius
                const adjustedHitArc = baseHitArc * Math.min(2, Math.max(1, sizeMultiplier));

                if (angleDiff < adjustedHitArc) {
                    const knockbackDir = {
                        x: dx / distance,
                        y: dy / distance
                    };
                    
                    // Calculate damage based on dash state
                    let damage = this.stats.damage;
                    let knockback = this.stats.knockback;
                    let shouldFreezeFrame = false;
                    if (this.owner instanceof Player && this.owner.isDashing()) {
                        damage *= 2; // Double damage during dash
                        knockback *= 2;
                        shouldFreezeFrame = true;
                    }

                    // Apply damage multiplier
                    damage *= this.damageMultiplier;
                    
                    target.takeDamage(damage, knockbackDir, knockback);
                    this.hitEntities.add(target);

                    // Play hit sound and trigger hit effect
                    if (this.owner instanceof Player) {
                        SoundManager.getInstance().playHitSound();
                        ParticleSystem.getInstance().createHitSparks(target.x, target.y, this.stats.color);
                    }
                    
                    const gameScene = this.parent?.parent as any;
                    if (gameScene && gameScene.handleHit) {
                        gameScene.handleHit(target, this);
                    }

                    // Trigger freeze frame for dash hits
                    if (shouldFreezeFrame) {
                        const gameScene = this.parent?.parent as any;
                        if (gameScene) {
                            gameScene.freezeFrameTimer = gameScene.constructor.FREEZE_FRAME_DURATION;
                        }
                    }
                }
            }
        });
    }

    public getColor(): number {
        return this.stats.color;
    }

    public getDamage(): number {
        return this.baseDamage * this.damageMultiplier;
    }

    public setDamageMultiplier(multiplier: number): void {
        this.damageMultiplier = multiplier;
    }
    public setAttackSpeedMultiplier(multiplier: number): void {
        this.stats.attackSpeed = this.stats.originalAttackSpeed! * multiplier;
    }
    public setSwingSpeedMultiplier(multiplier: number): void {
        this.swingSpeedMultiplier = multiplier;
        // Update attack speed (cooldown) based on the same multiplier
        this.stats.attackSpeed = this.stats.originalAttackSpeed! / multiplier;
        this.stats.windUpTime = this.stats.originalWindUpTime! / multiplier;
    }
} 