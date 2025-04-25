import * as PIXI from 'pixi.js';
import { Entity } from './Entity';
import { BasicSword } from './weapons/BasicSword';
import { Dash } from './abilities/Dash';
import { SoundManager } from '../systems/SoundManager';
import { InputManager } from '../systems/InputManager';

export class Player extends Entity {
    private graphics: PIXI.Graphics;
    private weapon: BasicSword;
    private dash: Dash;
    private soundManager: SoundManager;
    private isCurrentlyAttacking: boolean = false;
    private dashIndicator: PIXI.Graphics;
    private swordIndicator: PIXI.Graphics;
    private inputManager: InputManager;
    private stunned: boolean = false;
    private stunTimer: number = 0;
    private static readonly STUN_DURATION: number = 100; 
    private static readonly KNOCKBACK_THRESHOLD: number = 1.0; 
    private static readonly BASE_SPEED = 1.75;
    private baseSpeed: number = Player.BASE_SPEED;
    private speedMultiplier: number = 1;
    private swordLengthMultiplier: number = 1;
    private swingSpeedMultiplier: number = 1;
    protected speed: number = 5;
    protected maxHealth: number = 100;
    private baseMaxHealth: number = 100;
    private damageMultiplier: number = 1;
    private attackSpeedMultiplier: number = 1;
    private experience: number = 0;
    private level: number = 1;
    private static readonly EXP_PER_LEVEL: number = 150; // Base EXP needed per level
    private static readonly EXP_SCALING: number = 1.5; // How much more EXP each level needs
    private hasUpgradeAvailable: boolean = false; // Track if upgrade is available

    constructor(screenBounds: { width: number; height: number }) {
        super(screenBounds, 100); // 100 health points
        this.soundManager = SoundManager.getInstance();
        this.inputManager = new InputManager();
        
        // Create cooldown indicators
        this.dashIndicator = new PIXI.Graphics();
        this.swordIndicator = new PIXI.Graphics();
        this.addChild(this.dashIndicator);
        this.addChild(this.swordIndicator);
        
        // Create a simple player sprite
        this.graphics = new PIXI.Graphics();
        this.drawSprite();
        this.addChild(this.graphics);

        // Add weapon
        this.weapon = new BasicSword(this, false);
        this.addChild(this.weapon);

        // Initialize dash ability
        this.dash = new Dash(this, this.inputManager);
        this.filters = [];

    }

    private drawSprite(): void {
        this.graphics.clear();
        this.graphics.beginFill(0x3498db);
        this.graphics.moveTo(-10, -10);
        this.graphics.lineTo(10, 0);
        this.graphics.lineTo(-10, 10);
        this.graphics.lineTo(-10, -10);
        this.graphics.endFill();
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
        // Reset health to max
        this.health = this.maxHealth;
        
        // Reset movement state
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.resetSpeed();
        
        // Reset combat state
        this.isCurrentlyAttacking = false;
        this.stunned = false;
        this.stunTimer = 0;
        
        // Reset multipliers
        this.speedMultiplier = 1;
        this.swordLengthMultiplier = 1;
        this.swingSpeedMultiplier = 1;
        this.damageMultiplier = 1;
        this.attackSpeedMultiplier = 1;

        // Reset EXP and level
        this.experience = 0;
        this.level = 1;
        
        // Reset visual properties
        this.alpha = 1;
        
        // Reset dash
        if (this.dash) {
            this.dash.reset();
        }
        
        // Reset weapon
        if (this.weapon) {
            this.weapon.reset();
        }
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
        _keys: Set<string>,  // Prefixed with _ to indicate intentionally unused
        mouseX: number,
        mouseY: number,
        isDashing: boolean,
        targets: Entity[],
        isAttacking: boolean
    ): void {
        if (!this.isAlive()) return;

        // Update cooldown indicators
        this.drawDashIndicator(this.dash.getCooldownProgress());
        this.drawSwordIndicator(this.weapon.getCooldownProgress());

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
                this.weapon.swing();
            } else if (!isAttacking && this.isCurrentlyAttacking) {
                this.isCurrentlyAttacking = false;
            }
            
            this.weapon.update(delta, targets);
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

        // Handle weapon attack state and sound
        if (isAttacking && !this.isCurrentlyAttacking) {
            this.isCurrentlyAttacking = true;
            this.weapon.swing();
        } else if (!isAttacking && this.isCurrentlyAttacking) {
            this.isCurrentlyAttacking = false;
        }
        
        this.weapon.update(delta, targets);
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

    public isDashing(): boolean {
        return this.dash.isCurrentlyActive();
    }

    public increaseSwordLength(percentage: number): void {
        this.swordLengthMultiplier *= (1 + percentage);
        const newLength = 60 * this.swordLengthMultiplier; // 60 is the default blade length
        this.weapon.setBladeLength(newLength);
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
        console.log(`Increasing swing speed by ${percentage * 100}%`);
        this.swingSpeedMultiplier = (1 + percentage);
        if (this.weapon) {
            this.weapon.setSwingSpeedMultiplier(this.swingSpeedMultiplier);
        }
        console.log(`Swing speed increased by ${percentage * 100}%. New multiplier: ${this.swingSpeedMultiplier}`);
        console.log(`Attack speed increased by ${percentage * 100}%. New multiplier: ${this.attackSpeedMultiplier}`);
    }

    public gainExperience(amount: number): boolean {
        // If we already have an upgrade available, don't gain more XP
        if (this.hasUpgradeAvailable) {
            return false;
        }

        const expNeeded = this.getExpNeededForNextLevel();
        const newExp = this.experience + amount;
        
        if (newExp >= expNeeded) {
            // Level up and set upgrade available
            this.experience = expNeeded; // Cap at max XP instead of rolling over
            this.hasUpgradeAvailable = true;
            return true; // Indicates a level up occurred
        } else {
            this.experience = newExp;
            return false;
        }
    }

    public getLevel(): number {
        return this.level;
    }

    public getExperience(): number {
        return this.experience;
    }

    public getExpNeededForNextLevel(): number {
        return Math.floor(Player.EXP_PER_LEVEL * Math.pow(Player.EXP_SCALING, this.level - 1));
    }

    public getExperienceProgress(): number {
        return this.experience / this.getExpNeededForNextLevel();
    }

    public hasAvailableUpgrade(): boolean {
        return this.hasUpgradeAvailable;
    }

    public clearUpgradeAvailable(): void {
        this.hasUpgradeAvailable = false;
        this.level++;
        // When upgrade is used, reset XP to 0 for the new level
        this.experience = 0;
    }
} 