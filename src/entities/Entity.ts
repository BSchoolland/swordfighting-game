import * as PIXI from 'pixi.js';

export abstract class Entity extends PIXI.Container {
    public velocity: { x: number; y: number } = { x: 0, y: 0 };
    public radius: number = 10;  // Default radius for collision detection
    public health: number;
    public maxHealth: number;
    public target: Entity | null = null;
    protected bounds: PIXI.Rectangle;
    protected friction: number = 0.95;

    constructor(bounds: { width: number; height: number }, maxHealth: number) {
        super();
        this.bounds = new PIXI.Rectangle(0, 0, bounds.width, bounds.height);
        this.maxHealth = maxHealth;
        this.health = maxHealth;
    }

    public takeDamage(amount: number, knockbackDirection: { x: number, y: number }, knockbackForce: number): void {
        this.health = Math.max(0, this.health - amount);
        this.velocity.x = knockbackDirection.x * knockbackForce;
        this.velocity.y = knockbackDirection.y * knockbackForce;
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