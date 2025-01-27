import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { BaseWeapon, WeaponStats } from './BaseWeapon';
import { Projectile, ProjectileStats } from '../projectiles/Projectile';

export interface RangedWeaponStats extends WeaponStats {
    projectileStats: ProjectileStats;
}

export abstract class RangedWeapon extends BaseWeapon {
    protected abstract createProjectile(startPos: { x: number, y: number }, direction: { x: number, y: number }): Projectile;

    constructor(owner: Entity, stats: RangedWeaponStats, isEnemy: boolean = false) {
        super(owner, stats, isEnemy);
    }

    public update(delta: number, targets: Entity[]): void {
        // Handle wind-up phase
        if (this.isWindingUp) {
            const currentTime = Date.now();
            const elapsedWindUpTime = currentTime - this.windUpStartTime;
            const remainingWindUp = this.stats.windUpTime - elapsedWindUpTime;
            
            if (remainingWindUp <= 0) {
                console.log('[RangedWeapon] Wind-up complete, firing projectile');
                this.isWindingUp = false;
                this.previewSprite.visible = false;
                // Fire projectile immediately instead of entering swing phase
                this.onSwingComplete();
                this.isSwinging = false; // Reset state immediately
            }
        }
    }

    protected checkHits(targets: Entity[], prevAngle: number): void {
        // No melee hit detection for ranged weapons
    }

    protected onSwingComplete(): void {
        console.log('[RangedWeapon] Creating projectile');
        
        // Simply use owner's x,y position directly
        const startPos = {
            x: this.owner.x,
            y: this.owner.y
        };

        // For enemies, find direction to nearest target
        let direction = { x: 1, y: 0 }; // Default right direction
        if (this.isEnemy && this.owner.target) {
            // Calculate direction from enemy to player
            const dx = this.owner.target.x - this.owner.x;
            const dy = this.owner.target.y - this.owner.y;
            // Normalize the direction vector
            const length = Math.sqrt(dx * dx + dy * dy);
            direction = {
                x: dx / length,
                y: dy / length
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
            console.log('[RangedWeapon] Starting firing sequence');
            this.isWindingUp = true;
            this.windUpStartTime = currentTime;
            this.swingAngle = 0;
            this.rotation = 0; // No swing rotation for ranged weapons
            this.previewSprite.visible = true;
            this.lastSwingTime = currentTime;
        } else {
            console.log(`[RangedWeapon] Cannot fire - WindingUp: ${this.isWindingUp}, Swinging: ${this.isSwinging}, CooldownRemaining: ${this.stats.attackSpeed - timeSinceLastSwing}ms`);
        }
    }
} 