import * as PIXI from 'pixi.js';
import { Entity } from './Entity';

export class Sword extends PIXI.Container {
    private sprite: PIXI.Graphics;
    private isSwinging: boolean = false;
    private swingAngle: number = 0;
    private lastSwingTime: number = 0;
    private hitEntities: Set<Entity> = new Set();
    private owner: Entity;
    private isEnemy: boolean;

    // Sword parameters
    private static readonly PLAYER_PARAMS = {
        SWING_SPEED: 0.3,
        SWING_RANGE: Math.PI * 1.5, // 270 degrees
        DAMAGE: 15,
        KNOCKBACK: 5,
        COOLDOWN: 1000,
        BLADE_LENGTH: 60,
        BLADE_WIDTH: 4,
        SWING_INFLUENCE: 0.5,
        COLOR: 0xFFFFFF,
        OPTIMAL_RANGE: 0.8, // Multiplier of blade length for optimal range
        RETREAT_RANGE: 0.6  // Multiplier of blade length for retreat range
    };

    private static readonly ENEMY_PARAMS = {
        SWING_SPEED: 0.2,
        SWING_RANGE: Math.PI * 1.2,
        DAMAGE: 10,
        KNOCKBACK: 3,
        COOLDOWN: 2000,
        BLADE_LENGTH: 40,
        BLADE_WIDTH: 3,
        SWING_INFLUENCE: 0.3,
        COLOR: 0xFF6666,
        OPTIMAL_RANGE: 0.9, // Enemies try to stay a bit closer
        RETREAT_RANGE: 0.7
    };

    constructor(owner: Entity, isEnemy: boolean = false) {
        super();
        this.owner = owner;
        this.isEnemy = isEnemy;
        this.sprite = new PIXI.Graphics();
        this.drawSword();
        this.addChild(this.sprite);
        this.sprite.visible = false;
    }

    private get PARAMS() {
        return this.isEnemy ? Sword.ENEMY_PARAMS : Sword.PLAYER_PARAMS;
    }

    public getRange(): { attackRange: number, retreatRange: number } {
        return {
            attackRange: this.PARAMS.BLADE_LENGTH * this.PARAMS.OPTIMAL_RANGE,
            retreatRange: this.PARAMS.BLADE_LENGTH * this.PARAMS.RETREAT_RANGE
        };
    }

    private drawSword(): void {
        this.sprite.clear();
        this.sprite.beginFill(this.PARAMS.COLOR);
        this.sprite.drawRect(0, -this.PARAMS.BLADE_WIDTH/2, this.PARAMS.BLADE_LENGTH, this.PARAMS.BLADE_WIDTH);
        this.sprite.endFill();
    }

    public update(delta: number, targets: Entity[]): void {
        if (this.isSwinging) {
            this.sprite.visible = true;
            this.swingAngle += this.PARAMS.SWING_SPEED;
            this.rotation = -this.PARAMS.SWING_RANGE/2 + this.swingAngle;

            if (this.swingAngle <= this.PARAMS.SWING_RANGE) {
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
        if (!this.isSwinging && currentTime - this.lastSwingTime >= this.PARAMS.COOLDOWN) {
            this.isSwinging = true;
            this.swingAngle = 0;
            this.lastSwingTime = currentTime;
            this.sprite.visible = true;
            this.hitEntities.clear();
        }
    }

    private checkHits(targets: Entity[]): void {
        const globalPos = this.getGlobalPosition();
        const swordTip = {
            x: globalPos.x + Math.cos(this.rotation) * this.PARAMS.BLADE_LENGTH,
            y: globalPos.y + Math.sin(this.rotation) * this.PARAMS.BLADE_LENGTH
        };

        targets.forEach(target => {
            if (target === this.owner || !target.isAlive() || this.hitEntities.has(target)) return;

            const dx = target.x - this.owner.x;
            const dy = target.y - this.owner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.PARAMS.BLADE_LENGTH) {
                const knockbackDir = {
                    x: dx / distance,
                    y: dy / distance
                };
                
                const swingFactor = Math.sin(this.swingAngle - this.PARAMS.SWING_RANGE/2) * this.PARAMS.SWING_INFLUENCE;
                knockbackDir.x += Math.cos(this.rotation + Math.PI/2) * swingFactor;
                knockbackDir.y += Math.sin(this.rotation + Math.PI/2) * swingFactor;
                
                const length = Math.sqrt(knockbackDir.x * knockbackDir.x + knockbackDir.y * knockbackDir.y);
                knockbackDir.x /= length;
                knockbackDir.y /= length;
                
                target.takeDamage(this.PARAMS.DAMAGE, knockbackDir, this.PARAMS.KNOCKBACK);
                this.hitEntities.add(target);
            }
        });
    }

    // Method to modify sword parameters at runtime if needed
    public static setParam(param: keyof typeof Sword.PLAYER_PARAMS, value: number): void {
        Sword.PLAYER_PARAMS[param] = value;
    }
} 