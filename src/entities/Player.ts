import * as PIXI from 'pixi.js';
import { Entity } from './Entity';
import { BasicSword } from './weapons/BasicSword';
import { BaseEnemy } from './enemies/BaseEnemy';
import { Dash } from './abilities/Dash';
import { SoundManager } from '../systems/SoundManager';

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

    constructor(screenBounds: { width: number; height: number }) {
        super(screenBounds, 100); // 100 health points
        this.soundManager = SoundManager.getInstance();
        
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
        this.dash = new Dash(this);
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

        // Calculate movement vector
        let dx = 0;
        let dy = 0;

        // Calculate movement from input
        if (keys.has('KeyW')) dy -= 1;
        if (keys.has('KeyS')) dy += 1;
        if (keys.has('KeyA')) dx -= 1;
        if (keys.has('KeyD')) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = dx / length;
            dy = dy / length;
        }

        // Apply movement
        this.velocity.x = dx * this.speed;
        this.velocity.y = dy * this.speed;

        // Handle dash
        if (isDashing) {
            if (this.dash.tryActivate()) {
                this.soundManager.playDashSound();
            }
        }

        // Apply velocity and knockback
        this.applyVelocity();

        // Update rotation to face mouse
        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        this.rotation = angle;

        // Handle sword attack state and sound
        if (isAttacking && !this.isCurrentlyAttacking) {
            this.isCurrentlyAttacking = true;
            this.sword.swing();
            this.soundManager.playSwingSound();
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
        }
    }
} 