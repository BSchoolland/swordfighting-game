import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { Projectile, ProjectileStats } from './Projectile';

export class Arrow extends Projectile {
    private static readonly STATS: ProjectileStats = {
        speed: 5,
        damage: 10,
        knockback: 3,
        size: 4,
        color: 0xCCCCCC,
        lifetime: 2000, // 2 seconds
        maxRange: 300  // Maximum travel distance
    };

    constructor(
        x: number,
        y: number,
        angle: number,
        bounds: { width: number; height: number },
        isEnemy: boolean = false,
        owner: Entity | null = null
    ) {
        const stats = {...Arrow.STATS};
        if (isEnemy) {
            stats.damage = 8; // Less damage for enemy arrows
        }
        super(x, y, angle, bounds, stats, isEnemy, owner);
        
        // Create sprite - must be initialized before drawProjectile is called
        this.sprite = new PIXI.Graphics();
        this.addChild(this.sprite);
    }

    protected drawProjectile(): void {
        this.sprite.clear();
        
        // Draw arrow shaft
        this.sprite.lineStyle(2, this.stats.color);
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(this.stats.size * 3, 0);
        
        // Draw arrow head
        this.sprite.beginFill(this.stats.color);
        this.sprite.moveTo(this.stats.size * 3, 0);
        this.sprite.lineTo(this.stats.size * 2, -this.stats.size);
        this.sprite.lineTo(this.stats.size * 4, 0);
        this.sprite.lineTo(this.stats.size * 2, this.stats.size);
        this.sprite.lineTo(this.stats.size * 3, 0);
        this.sprite.endFill();
        
        // Draw fletching
        this.sprite.beginFill(this.stats.color);
        this.sprite.moveTo(0, 0);
        this.sprite.lineTo(-this.stats.size, -this.stats.size);
        this.sprite.lineTo(this.stats.size, 0);
        this.sprite.lineTo(-this.stats.size, this.stats.size);
        this.sprite.lineTo(0, 0);
        this.sprite.endFill();
    }
} 