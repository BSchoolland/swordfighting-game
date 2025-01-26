import * as PIXI from 'pixi.js';
import { Enemy } from './Enemy';

export class Sword extends PIXI.Container {
    private sprite: PIXI.Graphics;
    private isSwinging: boolean = false;
    private swingAngle: number = 0;
    private lastSwingTime: number = 0;
    private hitEnemies: Set<Enemy> = new Set();

    // Sword parameters
    private static readonly PARAMS = {
        SWING_SPEED: 0.5,
        SWING_RANGE: Math.PI * 1.5, // 270 degrees
        DAMAGE: 15,
        KNOCKBACK: 5,
        COOLDOWN: 1000,
        BLADE_LENGTH: 60,
        BLADE_WIDTH: 4,
        SWING_INFLUENCE: 0.5 
    };

    constructor() {
        super();
        this.sprite = new PIXI.Graphics();
        this.drawSword();
        this.addChild(this.sprite);
        this.sprite.visible = false;
    }

    private drawSword(): void {
        this.sprite.clear();
        this.sprite.beginFill(0xFFFFFF);
        this.sprite.drawRect(0, -Sword.PARAMS.BLADE_WIDTH/2, Sword.PARAMS.BLADE_LENGTH, Sword.PARAMS.BLADE_WIDTH);
        this.sprite.endFill();
    }

    public update(delta: number, enemies: Enemy[]): void {
        if (this.isSwinging) {
            this.sprite.visible = true;
            this.swingAngle += Sword.PARAMS.SWING_SPEED;
            this.rotation = -Sword.PARAMS.SWING_RANGE/2 + this.swingAngle;

            if (this.swingAngle <= Sword.PARAMS.SWING_RANGE) {
                this.checkHits(enemies);
            } else {
                this.isSwinging = false;
                this.rotation = 0;
                this.swingAngle = 0;
                this.sprite.visible = false;
                this.hitEnemies.clear();
            }
        }
    }

    public swing(): void {
        const currentTime = Date.now();
        if (!this.isSwinging && currentTime - this.lastSwingTime >= Sword.PARAMS.COOLDOWN) {
            this.isSwinging = true;
            this.swingAngle = 0;
            this.lastSwingTime = currentTime;
            this.sprite.visible = true;
            this.hitEnemies.clear();
        }
    }

    private checkHits(enemies: Enemy[]): void {
        const globalPos = this.getGlobalPosition();
        const swordTip = {
            x: globalPos.x + Math.cos(this.rotation) * Sword.PARAMS.BLADE_LENGTH,
            y: globalPos.y + Math.sin(this.rotation) * Sword.PARAMS.BLADE_LENGTH
        };

        enemies.forEach(enemy => {
            if (!enemy.isAlive() || this.hitEnemies.has(enemy)) return;

            const dx = enemy.x - this.parent.x;
            const dy = enemy.y - this.parent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < Sword.PARAMS.BLADE_LENGTH) {
                const knockbackDir = {
                    x: dx / distance,
                    y: dy / distance
                };
                
                // Add swing direction to knockback
                const swingFactor = Math.sin(this.swingAngle - Sword.PARAMS.SWING_RANGE/2) * Sword.PARAMS.SWING_INFLUENCE;
                knockbackDir.x += Math.cos(this.rotation + Math.PI/2) * swingFactor;
                knockbackDir.y += Math.sin(this.rotation + Math.PI/2) * swingFactor;
                
                // Normalize the combined direction
                const length = Math.sqrt(knockbackDir.x * knockbackDir.x + knockbackDir.y * knockbackDir.y);
                knockbackDir.x /= length;
                knockbackDir.y /= length;
                
                enemy.takeDamage(Sword.PARAMS.DAMAGE, knockbackDir, Sword.PARAMS.KNOCKBACK);
                this.hitEnemies.add(enemy);
            }
        });
    }

    // Method to modify sword parameters at runtime if needed
    public static setParam(param: keyof typeof Sword.PARAMS, value: number): void {
        Sword.PARAMS[param] = value;
    }
} 