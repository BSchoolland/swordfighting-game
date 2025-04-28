import * as PIXI from 'pixi.js';
import { SoundManager } from '../systems/SoundManager';
import { GlowFilter } from '@pixi/filter-glow';


export abstract class Entity extends PIXI.Container {
    public velocity: { x: number; y: number } = { x: 0, y: 0 };
    public radius: number = 10;  // Default radius for collision detection
    protected health: number = 100;
    protected maxHealth: number = 100;
    public target: Entity | null = null;
    public isEnemy: boolean = false;  // Default to false, enemies will set this to true
    public isBlocking: boolean = false;
    protected healthBar: PIXI.Container | null = null;
    protected sprite: PIXI.Sprite | PIXI.Graphics | null = null;
    protected debugId: string = 'Entity';
    protected bounds: { width: number; height: number };
    protected friction: number = 0.95;
    protected speed: number = 2;  // Default movement speed
    public canBlock: boolean = false;
     // glow
    public glowFilter: GlowFilter;

    constructor(bounds: { width: number; height: number }, maxHealth: number) {
        super();
        this.bounds = new PIXI.Rectangle(0, 0, bounds.width, bounds.height);
        this.maxHealth = maxHealth;
        this.health = maxHealth;

        // glow
        this.glowFilter = new GlowFilter({
            color: 0xffffff,
            distance: 20,
            outerStrength: 0.75,
            innerStrength: 0,
            quality: 0.1
        });
        this.filters = [this.glowFilter];
    }

    public takeDamage(amount: number, knockbackDirection?: { x: number, y: number }, knockbackForce: number = 20): void {
        // Check if entity can block/parry
        if (this.canBlock && this.isBlocking) {
            SoundManager.getInstance().playParrySound();
            return;
        }

        this.health = Math.max(0, Math.round(this.health - amount));
        
        // Apply knockback if direction is provided
        if (knockbackDirection) {
            this.velocity.x = knockbackDirection.x * knockbackForce;
            this.velocity.y = knockbackDirection.y * knockbackForce;
        }

        // if this is now less than half of max health (and total health is less than 100 so bosses don't fade), fade the glow filter
        if (this.health <= this.maxHealth / 2 && this.maxHealth < 100) {
            this.glowFilter.outerStrength = 0.25;
        } else {
            this.glowFilter.outerStrength = 0.75;
        }

        // Update health bar if it exists
        this.updateHealthBar();
    }

    protected updateHealthBar(): void {
        // This should be overridden by child classes
        // that implement specific health bar behavior
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

    protected applyVelocity(delta: number = 1/60): void {
        // Scale movement by delta time for framerate independence
        // Default delta of 1/60 maintains backward compatibility
        this.x += this.velocity.x * delta * 60;
        this.y += this.velocity.y * delta * 60;
        
        // Make friction framerate-independent
        const frictionFactor = Math.pow(this.friction, 60 * delta);
        this.velocity.x *= frictionFactor;
        this.velocity.y *= frictionFactor;

        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;

        // Use radius for boundary collision
        this.x = Math.max(this.radius, Math.min(this.bounds.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(this.bounds.height - this.radius, this.y));
    }

    public abstract update(...args: any[]): void;
} 