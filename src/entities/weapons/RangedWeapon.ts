// @ts-ignore - PIXI is required for inheritance
// PIXI import needed as this class extends BaseWeapon which extends PIXI.Container
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';
import { Projectile, ProjectileStats } from '../projectiles/Projectile';
import { SoundManager } from '../../systems/SoundManager';

export interface RangedWeaponStats extends WeaponStats {
    projectileStats: ProjectileStats;
}

export abstract class RangedWeapon extends BaseWeapon {
    protected abstract createProjectile(startPos: { x: number, y: number }, direction: { x: number, y: number }): Projectile;

    constructor(owner: Entity, stats: RangedWeaponStats, isEnemy: boolean = false) {
        super(owner, stats, isEnemy);
    }

    public update(_delta: number, _targets: Entity[]): void {
        // Handle wind-up phase
        if (this.isWindingUp) {
            const currentTime = Date.now();
            const elapsedWindUpTime = currentTime - this.windUpStartTime;
            const remainingWindUp = this.stats.windUpTime - elapsedWindUpTime;
            
            if (remainingWindUp <= 0) {
                this.isWindingUp = false;
                this.previewSprite.visible = false;
                // Fire projectile immediately instead of entering swing phase
                this.onSwingComplete();
                this.isSwinging = false; // Reset state immediately
            }
        }
    }

    protected checkHits(_targets: Entity[], _prevAngle: number): void {
        // No melee hit detection for ranged weapons
    }

    protected onSwingComplete(): void {
        console.log('[RangedWeapon] Creating projectile');
        
        // Simply use owner's x,y position directly
        const startPos = {
            x: this.owner.x,
            y: this.owner.y
        };

        // Calculate direction based on owner's target or rotation
        let direction = { x: 0, y: 0 };
        
        if (this.isEnemy && this.owner.target) {
            // For enemies, aim at their target (usually the player)
            const dx = this.owner.target.x - this.owner.x;
            const dy = this.owner.target.y - this.owner.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            direction = {
                x: dx / length,
                y: dy / length
            };
        } else {
            // For players, use the owner's rotation to determine direction
            direction = {
                x: Math.cos(this.owner.rotation),
                y: Math.sin(this.owner.rotation)
            };
        }

        // Create and add projectile to the game scene
        const projectile = this.createProjectile(startPos, direction);
        const gameScene = this.parent?.parent;
        if (gameScene && 'addProjectile' in gameScene) {
            (gameScene as any).addProjectile(projectile);
            console.log('[RangedWeapon] Projectile created and added to game scene', {
                startPos,
                direction
            });
        } else {
            console.warn('[RangedWeapon] Could not add projectile - no game scene found');
        }
    }

    public swing(): void {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;

        if (!this.isWindingUp && !this.isSwinging && timeSinceLastSwing >= this.stats.attackSpeed) {
            this.isWindingUp = true;
            this.windUpStartTime = currentTime;
            this.swingAngle = 0;
            this.rotation = 0; // No swing rotation for ranged weapons
            this.previewSprite.visible = true;
            this.lastSwingTime = currentTime;
            // play the swing sound
            // Play weapon-specific swing sound if it exists
            if (this.stats.swingSound) {
                // wait the windup time
                setTimeout(() => {
                    if (this.stats.swingSound) {
                        SoundManager.getInstance().playSound(this.stats.swingSound);
                    }
                }, this.stats.windUpTime);
            }
        } else {
        }
    }
} 