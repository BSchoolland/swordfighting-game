import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { Player } from '../Player';
import { ParticleSystem } from '../../effects/ParticleSystem';

export interface WeaponStats {
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
}

export abstract class BaseWeapon extends PIXI.Container {
    protected sprite: PIXI.Graphics;
    protected previewSprite: PIXI.Graphics;
    protected isSwinging: boolean = false;
    protected isWindingUp: boolean = false;
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

    constructor(owner: Entity, stats: WeaponStats, isEnemy: boolean = false) {
        super();
        this.owner = owner;
        this.stats = stats;
        this.isEnemy = isEnemy;
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
        return {
            attackRange: this.stats.bladeLength * this.stats.optimalRange,
            retreatRange: this.stats.bladeLength * this.stats.retreatRange
        };
    }

    protected abstract drawWeapon(): void;
    protected abstract drawPreviewWeapon(): void;

    public update(delta: number, targets: Entity[]): void {
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
        }
    }

    public isInWindUp(): boolean {
        return this.isWindingUp;
    }

    public isInSwing(): boolean {
        return this.isSwinging;
    }

    protected checkHits(targets: Entity[], prevAngle: number): void {
        targets.forEach(target => {
            if (target === this.owner || !target.isAlive() || this.hitEntities.has(target)) return;

            const dx = target.x - this.owner.x;
            const dy = target.y - this.owner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Check if target is in range
            if (distance < this.stats.bladeLength) {
                // Get angle to target relative to world coordinates
                const angleToTarget = Math.atan2(dy, dx);
                
                // Get the weapon's world angle by adding owner's rotation
                const weaponWorldAngle = this.rotation + this.owner.rotation;
                
                // Normalize angles to [-PI, PI] range
                const normalizedWeaponAngle = ((weaponWorldAngle % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
                const normalizedTargetAngle = ((angleToTarget % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
                
                // Calculate the absolute angular difference accounting for wrap-around
                let angleDiff = Math.abs(normalizedWeaponAngle - normalizedTargetAngle);
                if (angleDiff > Math.PI) {
                    angleDiff = 2 * Math.PI - angleDiff;
                }

                console.log(`[${this.debugId}] weaponAngle: ${normalizedWeaponAngle.toFixed(2)}, targetAngle: ${normalizedTargetAngle.toFixed(2)}, diff: ${angleDiff.toFixed(2)}`);

                // Check if the weapon is pointing towards the target within the hit arc
                if (angleDiff < Math.PI/6) {  // Increased hit arc slightly to 30 degrees
                    console.log(`[${this.debugId}] Target hit`);
                    // Knockback direction is directly away from player
                    const knockbackDir = {
                        x: dx / distance,
                        y: dy / distance
                    };
                    
                    target.takeDamage(this.stats.damage, knockbackDir, this.stats.knockback);
                    this.hitEntities.add(target);
                    
                    // Trigger hit effect
                    const gameScene = this.parent?.parent as any;
                    if (gameScene && gameScene.handleHit) {
                        gameScene.handleHit(target, this);
                    }
                }
            }
        });
    }

    public getColor(): number {
        return this.stats.color;
    }
} 