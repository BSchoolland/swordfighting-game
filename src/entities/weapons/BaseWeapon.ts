import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { Player } from '../Player';

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
            this.swingAngle += this.stats.swingSpeed;
            this.rotation = -this.stats.swingRange/2 + this.swingAngle;

            if (this.swingAngle <= this.stats.swingRange) {
                this.checkHits(targets);
            } else {
                this.isSwinging = false;
                this.rotation = 0;
                this.swingAngle = 0;
                this.sprite.visible = false;
                this.hitEntities.clear();
            }
        }
    }

    public swing(): void {
        const currentTime = Date.now();
        const timeSinceLastSwing = currentTime - this.lastSwingTime;

        if (!this.isWindingUp && !this.isSwinging && timeSinceLastSwing >= this.stats.attackSpeed) {
            this.isWindingUp = true;
            this.windUpStartTime = currentTime;
            this.swingAngle = 0;
            this.rotation = -this.stats.swingRange/2;
            this.previewSprite.visible = true;
            this.lastSwingTime = currentTime;
            this.hitEntities.clear();
        }
    }

    public isInWindUp(): boolean {
        return this.isWindingUp;
    }

    protected checkHits(targets: Entity[]): void {
        const globalPos = this.getGlobalPosition();
        const weaponTip = {
            x: globalPos.x + Math.cos(this.rotation) * this.stats.bladeLength,
            y: globalPos.y + Math.sin(this.rotation) * this.stats.bladeLength
        };

        targets.forEach(target => {
            if (target === this.owner || !target.isAlive() || this.hitEntities.has(target)) return;

            const dx = target.x - this.owner.x;
            const dy = target.y - this.owner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.stats.bladeLength) {
                const knockbackDir = {
                    x: dx / distance,
                    y: dy / distance
                };
                
                const swingFactor = Math.sin(this.swingAngle - this.stats.swingRange/2) * this.stats.swingInfluence;
                knockbackDir.x += Math.cos(this.rotation + Math.PI/2) * swingFactor;
                knockbackDir.y += Math.sin(this.rotation + Math.PI/2) * swingFactor;
                
                const length = Math.sqrt(knockbackDir.x * knockbackDir.x + knockbackDir.y * knockbackDir.y);
                knockbackDir.x /= length;
                knockbackDir.y /= length;
                
                target.takeDamage(this.stats.damage, knockbackDir, this.stats.knockback);
                this.hitEntities.add(target);
            }
        });
    }
} 