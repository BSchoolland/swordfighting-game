import * as PIXI from 'pixi.js';
import { Entity } from './Entity';
import { BasicSword } from './weapons/BasicSword';
import { BaseEnemy } from './enemies/BaseEnemy';
import { Dash } from './abilities/Dash';

export class Player extends Entity {
    private sprite: PIXI.Graphics;
    private sword: BasicSword;
    private dash: Dash;
    private lastDamageSource: Entity | null = null;
    private knockbackForce: number = 20;

    constructor(screenBounds: { width: number; height: number }) {
        super(screenBounds, 100); // 100 health points
        
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
            this.dash.activate();
        }

        // Apply velocity and knockback
        this.applyVelocity();

        // Update rotation to face mouse
        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        this.rotation = angle;

        // Handle sword
        if (isAttacking) {
            this.sword.swing();
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
        
        // Apply knockback if direction is provided
        if (knockbackDirection) {
            this.velocity.x = knockbackDirection.x * knockbackForce;
            this.velocity.y = knockbackDirection.y * knockbackForce;
        }
    }
} 