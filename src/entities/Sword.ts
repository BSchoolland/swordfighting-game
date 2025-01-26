import * as PIXI from 'pixi.js';
import { Entity } from './Entity';

export class Sword extends PIXI.Container {
    private sprite: PIXI.Graphics;
    private previewSprite: PIXI.Graphics;
    private isSwinging: boolean = false;
    private isWindingUp: boolean = false;
    private swingAngle: number = 0;
    private lastSwingTime: number = 0;
    private windUpTimer: number = 0;
    private hitEntities: Set<Entity> = new Set();
    private owner: Entity;
    private isEnemy: boolean;
    private debugId: string;
    private windUpStartTime: number = 0;

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
        RETREAT_RANGE: 0.6,  // Multiplier of blade length for retreat range
        WIND_UP_TIME: 100, // Shorter delay for player
        PREVIEW_ALPHA: 0.4
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
        RETREAT_RANGE: 0.7,
        WIND_UP_TIME: 300, // Longer delay for enemies
        PREVIEW_ALPHA: 0.3
    };

    constructor(owner: Entity, isEnemy: boolean = false) {
        super();
        this.owner = owner;
        this.isEnemy = isEnemy;
        this.debugId = isEnemy ? `Enemy_${Math.floor(Math.random() * 1000)}` : 'Player';
        console.log(`[${this.debugId}] Sword created`);

        // Create preview sprite (lighter version of sword)
        this.previewSprite = new PIXI.Graphics();
        this.drawPreviewSword();
        this.addChild(this.previewSprite);
        this.previewSprite.visible = false;

        // Create main sword sprite
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

    private drawPreviewSword(): void {
        this.previewSprite.clear();
        this.previewSprite.beginFill(this.PARAMS.COLOR);
        this.previewSprite.drawRect(0, -this.PARAMS.BLADE_WIDTH/2, this.PARAMS.BLADE_LENGTH, this.PARAMS.BLADE_WIDTH);
        this.previewSprite.endFill();
        this.previewSprite.alpha = this.PARAMS.PREVIEW_ALPHA;
    }

    public update(delta: number, targets: Entity[]): void {
        if (this.isWindingUp) {
            const currentTime = Date.now();
            const elapsedWindUpTime = currentTime - this.windUpStartTime;
            const remainingWindUp = this.PARAMS.WIND_UP_TIME - elapsedWindUpTime;
            
            console.log(`Sword wind-up: ${remainingWindUp.toFixed(0)}ms remaining, owner: ${this.isEnemy ? 'Enemy' : 'Player'}`);
            
            if (remainingWindUp <= 0) {
                console.log('Wind-up complete, starting swing');
                this.isWindingUp = false;
                this.isSwinging = true;
                this.previewSprite.visible = false;
                this.sprite.visible = true;
                this.swingAngle = 0;
            }
        }

        if (this.isSwinging) {
            this.swingAngle += this.PARAMS.SWING_SPEED;
            this.rotation = -this.PARAMS.SWING_RANGE/2 + this.swingAngle;
            console.log(`Sword swinging: angle=${(this.swingAngle * 180 / Math.PI).toFixed(1)}°`);

            if (this.swingAngle <= this.PARAMS.SWING_RANGE) {
                this.checkHits(targets);
            } else {
                console.log('Swing complete');
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
        console.log(`Swing attempt - cooldown: ${(this.PARAMS.COOLDOWN - timeSinceLastSwing).toFixed(0)}ms remaining`);

        if (!this.isWindingUp && !this.isSwinging && timeSinceLastSwing >= this.PARAMS.COOLDOWN) {
            console.log('Starting new swing (wind-up)');
            this.isWindingUp = true;
            this.windUpStartTime = currentTime;
            this.swingAngle = 0;
            this.rotation = -this.PARAMS.SWING_RANGE/2;
            this.previewSprite.visible = true;
            this.lastSwingTime = currentTime;
            this.hitEntities.clear();
        } else {
            console.log(`Swing rejected - ${this.isWindingUp ? 'winding up' : this.isSwinging ? 'swinging' : 'on cooldown'}`);
        }
    }

    public isInWindUp(): boolean {
        return this.isWindingUp;
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
                console.log(`[${this.debugId}] Hit detected at distance ${distance.toFixed(1)}`);
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