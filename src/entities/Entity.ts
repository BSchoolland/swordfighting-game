import * as PIXI from 'pixi.js';

export abstract class Entity extends PIXI.Container {
    protected health: number;
    protected maxHealth: number;
    protected bounds: { width: number; height: number };
    protected velocity: { x: number; y: number } = { x: 0, y: 0 };
    protected friction: number = 0.95;

    constructor(bounds: { width: number; height: number }, maxHealth: number) {
        super();
        this.bounds = bounds;
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

    protected applyVelocity(): void {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;

        const halfWidth = 10;
        const halfHeight = 10;
        this.x = Math.max(halfWidth, Math.min(this.bounds.width - halfWidth, this.x));
        this.y = Math.max(halfHeight, Math.min(this.bounds.height - halfHeight, this.y));
    }

    public abstract update(...args: any[]): void;
} 