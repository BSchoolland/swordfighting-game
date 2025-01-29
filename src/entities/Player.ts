import * as PIXI from 'pixi.js';
import { Entity } from './Entity';
import { BasicSword } from './weapons/BasicSword';
import { BaseEnemy } from './enemies/BaseEnemy';
import { Dash } from './abilities/Dash';
import { SoundManager } from '../systems/SoundManager';
import { InputManager } from '../systems/InputManager';
import { BaseWeapon } from './weapons/BaseWeapon';

export class Player extends Entity {
    private sprite: PIXI.Graphics;
    private sword: BasicSword;
    private dash: Dash;
    private lastDamageSource: Entity | null = null;
    private knockbackForce: number = 20;
    private soundManager: SoundManager;
    private isCurrentlyAttacking: boolean = false;
    private dashIndicator: PIXI.Graphics;
    private swordIndicator: PIXI.Graphics;
    private inputManager: InputManager;
    private stunned: boolean = false;
    private stunTimer: number = 0;
    private static readonly STUN_DURATION: number = 100; // Reduced from 200ms to 100ms
    private static readonly KNOCKBACK_THRESHOLD: number = 1.0; // Increased from 0.5 to make recovery faster
    private static readonly BASE_SPEED = 1.75;
    private baseSpeed: number = Player.BASE_SPEED;
    private speedMultiplier: number = 1;
    private swordLengthMultiplier: number = 1;
    private swingSpeedMultiplier: number = 1;
    private speed: number = 5;
    protected maxHealth: number = 100;
    private baseMaxHealth: number = 100;
    private baseDamage: number = 1;
    private damageMultiplier: number = 1;
    private weapon: BaseWeapon | null = null;

    constructor(screenBounds: { width: number; height: number }) {
        super(screenBounds, 100); // 100 health points
        this.soundManager = SoundManager.getInstance();
        this.inputManager = new InputManager();
        
        // Create cooldown indicators (behind player)
        this.dashIndicator = new PIXI.Graphics();
        this.swordIndicator = new PIXI.Graphics();
        this.addChild(this.dashIndicator);
        this.addChild(this.swordIndicator);
        
        // Create a simple player sprite (blue triangle for directional visibility)
        this.sprite = new PIXI.Graphics();
        this.drawSprite();
        this.addChild(this.sprite);

        // Add sword
        this.sword = new BasicSword(this, false);
        this.addChild(this.sword);

        // Initialize dash ability
        this.dash = new Dash(this, this.inputManager);
    }

    private drawSprite(): void {
        this.sprite.clear();
        this.sprite.beginFill(0x3498db);
        this.sprite.moveTo(-10, -10);
        this.sprite.lineTo(10, 0);
        this.sprite.lineTo(-10, 10);
        this.sprite.lineTo(-10, -10);
        this.sprite.endFill();
    }

    private drawCooldownIndicator(graphics: PIXI.Graphics, progress: number, radius: number, baseColor: number, readyColor: number): void {
        graphics.clear();
        
        // Draw background circle
        graphics.lineStyle(2, baseColor, 0.15);
        graphics.drawCircle(0, 0, radius);
        
        // Draw progress arc
        if (progress < 1) {
            graphics.lineStyle(2, readyColor, 0.3);
            const angle = -Math.PI / 2; // Start from top
            const endAngle = angle + (Math.PI * 2 * progress);
            graphics.arc(0, 0, radius, angle, endAngle);
        } else {
            // Draw ready indicator
            graphics.lineStyle(2, readyColor, 0.4);
            graphics.drawCircle(0, 0, radius);
        }
    }

    private drawDashIndicator(progress: number): void {
        this.drawCooldownIndicator(this.dashIndicator, progress, 15, 0x666666, 0x00ffff);
    }

    private drawSwordIndicator(progress: number): void {
        this.drawCooldownIndicator(this.swordIndicator, progress, 18, 0x666666, 0xff3333);
    }

    public reset(): void {
        this.health = this.maxHealth;
        this.velocity.x = 0;
        this.velocity.y = 0;
    }

    public getHealth(): number {
        return this.health;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public getDashCooldownProgress(): number {
        return this.dash.getCooldownProgress();
    }

    public update(
        delta: number,
        keys: Set<string>,
        mouseX: number,
        mouseY: number,
        isDashing: boolean,
        targets: Entity[],
        isAttacking: boolean
    ): void {
        if (!this.isAlive()) return;

        // Update cooldown indicators
        this.drawDashIndicator(this.dash.getCooldownProgress());
        this.drawSwordIndicator(this.sword.getCooldownProgress());

        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

        // Handle stun and knockback first
        if (this.stunned) {
            this.stunTimer -= delta * 16.67;
            if (this.stunTimer <= 0 || currentSpeed < Player.KNOCKBACK_THRESHOLD) {
                this.stunned = false;
                if (currentSpeed < Player.KNOCKBACK_THRESHOLD) {
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                }
            }
            // Apply knockback velocity
            this.applyVelocity();
            
            // Allow attacking and rotation even while stunned
            const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
            this.rotation = angle;

            if (isAttacking && !this.isCurrentlyAttacking) {
                this.isCurrentlyAttacking = true;
                this.sword.swing();
            } else if (!isAttacking && this.isCurrentlyAttacking) {
                this.isCurrentlyAttacking = false;
            }
            
            this.sword.update(delta, targets);
            return;
        }

        // Get movement from input manager
        const movement = this.inputManager.getMovementVector();
        
        // Apply movement using getSpeed() to include the multiplier
        this.velocity.x = movement.x * this.getSpeed();
        this.velocity.y = movement.y * this.getSpeed();

        // Handle dash
        if (isDashing) {
            if (this.dash.tryActivate()) {
                this.soundManager.playDashSound();
            }
        }

        // Apply velocity and knockback
        this.applyVelocity();

        // Update rotation to face aim point
        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        this.rotation = angle;

        // Handle sword attack state and sound
        if (isAttacking && !this.isCurrentlyAttacking) {
            this.isCurrentlyAttacking = true;
            this.sword.swing();
        } else if (!isAttacking && this.isCurrentlyAttacking) {
            this.isCurrentlyAttacking = false;
        }
        
        this.sword.update(delta, targets);
    }

    public heal(amount: number): void {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        console.log(`Player healed for ${amount}. Health: ${oldHealth} -> ${this.health}`);
    }

    public takeDamage(amount: number, knockbackDirection?: { x: number, y: number }, knockbackForce: number = 20): void {
        const oldHealth = this.health;
        this.health = Math.max(0, this.health - amount);
        console.log(`Player took ${amount} damage. Health: ${oldHealth} -> ${this.health}`);
        this.soundManager.playDamageSound();
        
        // Apply knockback if direction is provided
        if (knockbackDirection) {
            this.velocity.x = knockbackDirection.x * knockbackForce;
            this.velocity.y = knockbackDirection.y * knockbackForce;
            this.stunned = true;
            this.stunTimer = Player.STUN_DURATION;
        }
    }

    public increaseSpeed(percentage: number): void {
        this.speedMultiplier *= (1 + percentage);
        console.log(`Speed increased by ${percentage * 100}%. New multiplier: ${this.speedMultiplier}`);
    }

    public getSpeed(): number {
        return this.baseSpeed * this.speedMultiplier;
    }

    public setSpeed(speed: number): void {
        this.baseSpeed = speed;
    }

    public resetSpeed(): void {
        this.baseSpeed = Player.BASE_SPEED;
    }

    public getDash(): Dash {
        return this.dash;
    }

    public increaseSwordLength(percentage: number): void {
        this.swordLengthMultiplier *= (1 + percentage);
        const newLength = 60 * this.swordLengthMultiplier; // 60 is the default blade length
        this.sword.setBladeLength(newLength);
        console.log(`Sword length increased by ${percentage * 100}%. New multiplier: ${this.swordLengthMultiplier}`);
    }

    public increaseDamage(percentage: number): void {
        this.damageMultiplier *= (1 + percentage);
        // Update weapon damage
        if (this.weapon) {
            this.weapon.setDamageMultiplier(this.damageMultiplier);
        }
    }

    public increaseMaxHealth(percentage: number): void {
        const oldMaxHealth = this.maxHealth;
        this.maxHealth = this.baseMaxHealth * (1 + percentage);
        // Heal the difference so it feels like an immediate buff
        const healthDiff = this.maxHealth - oldMaxHealth;
        this.heal(healthDiff);
    }

    public increaseSwingSpeed(percentage: number): void {
        this.swingSpeedMultiplier *= (1 + percentage);
        if (this.sword) {
            this.sword.setSwingSpeedMultiplier(this.swingSpeedMultiplier);
        }
        console.log(`Swing speed increased by ${percentage * 100}%. New multiplier: ${this.swingSpeedMultiplier}`);
    }
} 