// @ts-ignore - PIXI is required for inheritance
// PIXI import needed as this class extends BaseWeapon which extends PIXI.Container
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { RangedWeapon, RangedWeaponStats } from './RangedWeapon';
import { Arrow } from '../projectiles/Arrow';

export class HunterBow extends RangedWeapon {
    private static readonly PLAYER_PARAMS: RangedWeaponStats = {
        damage: 12,
        knockback: 8,
        attackSpeed: 3000,
        range: 400,
        swingSpeed: 0,  // Not used for bow
        swingRange: 0,  // Not used for bow
        bladeLength: 40,
        bladeWidth: 4,
        swingInfluence: 0,
        color: 0x00aa44,
        optimalRange: 300,
        retreatRange: 200,
        windUpTime: 400,
        previewAlpha: 0.3,
        projectileStats: {
            speed: 7,
            damage: 12,
            knockback: 8,
            size: 3,
            color: 0x00aa44,
            lifetime: 2000,
            maxRange: 400
        }
    };

    private static readonly ENEMY_PARAMS: RangedWeaponStats = {
        damage: 10,
        knockback: 6,
        attackSpeed: 3000,
        range: 400,
        swingSpeed: 0,  // Not used for bow
        swingRange: 0,  // Not used for bow
        bladeLength: 40,
        bladeWidth: 4,
        swingInfluence: 0,
        color: 0x00aa44,
        optimalRange: 300,
        retreatRange: 200,
        windUpTime: 500,
        previewAlpha: 0.3,
        projectileStats: {
            speed: 6,
            damage: 10,
            knockback: 6,
            size: 3,
            color: 0x00aa44,
            lifetime: 2000,
            maxRange: 400
        }
    };

    private static readonly SPREAD_ANGLE = Math.PI / 8; // 22.5 degrees spread
    private static readonly ARROWS_PER_SHOT = 5;

    constructor(owner: Entity, isEnemy: boolean = false) {
        const params = isEnemy ? HunterBow.ENEMY_PARAMS : HunterBow.PLAYER_PARAMS;
        super(owner, params, isEnemy);
    }

    public getCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastShot = currentTime - this.lastSwingTime;
        return Math.min(1, timeSinceLastShot / this.stats.attackSpeed);
    }

    public setBladeLength(length: number): void {
        this.stats.bladeLength = length;
        this.drawWeapon();
    }

    public setSwingSpeedMultiplier(multiplier: number): void {
        this.swingSpeedMultiplier = multiplier;
        this.stats.attackSpeed = this.stats.originalAttackSpeed! / multiplier;
        this.stats.windUpTime = this.stats.originalWindUpTime! / multiplier;
    }

    public setDamageMultiplier(multiplier: number): void {
        this.damageMultiplier = multiplier;
    }

    public isInWindUp(): boolean {
        return this.isWindingUp;
    }

    protected createProjectile(startPos: { x: number, y: number }, direction: { x: number, y: number }): Arrow {
        const baseAngle = Math.atan2(direction.y, direction.x);
        const spreadStep = (HunterBow.SPREAD_ANGLE * 2) / (HunterBow.ARROWS_PER_SHOT - 1);
        
        // Get bounds from owner's parent (game scene)
        const bounds = this.owner.parent.getBounds();
        
        // Create and return the center arrow
        const centerArrow = new Arrow(
            bounds,
            this.owner,
            startPos,
            direction,
            this.isEnemy
        );
        
        // Get the game scene
        const gameScene = this.parent?.parent;
        if (gameScene && 'addProjectile' in gameScene) {
            // Create side arrows (skipping the center arrow index)
            for (let i = 0; i < HunterBow.ARROWS_PER_SHOT; i++) {
                if (i === Math.floor(HunterBow.ARROWS_PER_SHOT / 2)) continue; // Skip center arrow
                
                const angle = baseAngle - HunterBow.SPREAD_ANGLE + (spreadStep * i);
                const sideDirection = {
                    x: Math.cos(angle),
                    y: Math.sin(angle)
                };
                
                const arrow = new Arrow(
                    bounds,
                    this.owner,
                    startPos,
                    sideDirection,
                    this.isEnemy
                );
                
                // Add to game scene properly
                (gameScene as any).addProjectile(arrow);
            }
        }
        
        return centerArrow;
    }

    protected drawWeapon(): void {
        this.sprite.clear();
        this.sprite.lineStyle(2, this.stats.color);
        
        // Draw bow arc
        this.sprite.arc(0, 0, this.stats.bladeLength, -Math.PI/4, Math.PI/4);
        
        // Draw bowstring
        this.sprite.moveTo(this.stats.bladeLength * Math.cos(-Math.PI/4), this.stats.bladeLength * Math.sin(-Math.PI/4));
        this.sprite.lineTo(0, 0);
        this.sprite.lineTo(this.stats.bladeLength * Math.cos(Math.PI/4), this.stats.bladeLength * Math.sin(Math.PI/4));
    }

    protected drawPreviewWeapon(): void {
        this.previewSprite.clear();
        this.previewSprite.lineStyle(2, this.stats.color, this.stats.previewAlpha);
        
        // Draw bow arc
        this.previewSprite.arc(0, 0, this.stats.bladeLength, -Math.PI/4, Math.PI/4);
        
        // Draw bowstring
        this.previewSprite.moveTo(this.stats.bladeLength * Math.cos(-Math.PI/4), this.stats.bladeLength * Math.sin(-Math.PI/4));
        this.previewSprite.lineTo(0, 0);
        this.previewSprite.lineTo(this.stats.bladeLength * Math.cos(Math.PI/4), this.stats.bladeLength * Math.sin(Math.PI/4));
    }
} 