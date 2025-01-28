import * as PIXI from 'pixi.js';
import { HealthBar } from './HealthBar';
import { SoundManager } from '../systems/SoundManager';

export abstract class Entity extends PIXI.Container {
    public velocity: { x: number; y: number } = { x: 0, y: 0 };
    public radius: number = 10;  // Default radius for collision detection
    public health: number;
    public maxHealth: number;
    public target: Entity | null = null;
    public isEnemy: boolean = false;  // Default to false, enemies will set this to true
    protected bounds: PIXI.Rectangle;
    protected friction: number = 0.95;
    protected speed: number = 2;  // Default movement speed
    public canBlock: boolean = false;
    public isBlocking: boolean = false;
    protected healthBar: HealthBar | null = null;

    constructor(bounds: { width: number; height: number }, maxHealth: number) {
        super();
        this.bounds = new PIXI.Rectangle(0, 0, bounds.width, bounds.height);
        this.maxHealth = maxHealth;
        this.health = maxHealth;
    }

    public takeDamage(amount: number, knockbackDirection?: { x: number, y: number }, knockbackForce: number = 20): void {
        // Check if entity can block/parry
        if (this.canBlock && this.isBlocking) {
            SoundManager.getInstance().playParrySound();
            return;
        }

        const oldHealth = this.health;
        this.health = Math.max(0, this.health - amount);
        
        // Apply knockback if direction is provided
        if (knockbackDirection) {
            this.velocity.x = knockbackDirection.x * knockbackForce;
            this.velocity.y = knockbackDirection.y * knockbackForce;
        }

        // Update health bar if it exists
        if (this.healthBar) {
            this.healthBar.update(this.health / this.maxHealth);
        }
    }

    public isAlive(): boolean {
        return this.health > 0;
    }

    public getHealth(): number {
        return this.health;
    }

    public getRadius(): number {
        return this.radius;
    }

    public getSpeed(): number {
        return this.speed;
    }

    public setSpeed(speed: number): void {
        this.speed = speed;
    }

    public getVelocity(): { x: number, y: number } {
        return { ...this.velocity };
    }

    protected applyVelocity(): void {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;

        // Use radius for boundary collision
        this.x = Math.max(this.radius, Math.min(this.bounds.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(this.bounds.height - this.radius, this.y));
    }

    public abstract update(...args: any[]): void;
} 