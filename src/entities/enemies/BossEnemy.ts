import * as PIXI from 'pixi.js';
import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { Entity } from '../Entity';
import { BossHealthBar } from '../BossHealthBar';

export abstract class BossEnemy extends BaseEnemy {
    protected healthBar: BossHealthBar;
    protected static readonly BOSS_HEALTH_BAR_WIDTH = 200;
    protected static readonly BOSS_HEALTH_BAR_HEIGHT = 20;
    protected bossName: string;

    constructor(bounds: { width: number; height: number }, player: Player, stats: EnemyStats, name: string) {
        super(bounds, player, stats);
        this.bossName = name;
        
        // Create health bar with the boss name
        this.healthBar = new BossHealthBar(BossEnemy.BOSS_HEALTH_BAR_WIDTH, BossEnemy.BOSS_HEALTH_BAR_HEIGHT, name);
        this.healthBar.position.set(
            (bounds.width - 300) / 2,
            20 // Position at top of screen with some padding
        );
    }

    public onAddedToScene(): void {
        // Get the root scene container (parent of our parent)
        const scene = this.parent?.parent;
        if (scene) {
            if (!this.healthBar.parent) {
                scene.addChild(this.healthBar);
            }
        }
    }

    protected override updateHealthBar(): void {
        if (this.healthBar) {
            this.healthBar.updateHealth(this.health, this.maxHealth);
            this.healthBar.update(1/60);
        }
    }

    public update(delta: number, targets: Entity[] = []): void {
        super.update(delta, targets);
        // Update the animation but not the health values (which are updated in takeDamage)
        if (this.healthBar) {
            this.healthBar.update(delta);
        }
    }

    // Expose UI elements for GameScene to use
    public getHealthBar(): BossHealthBar {
        return this.healthBar;
    }

    public getNameText(): PIXI.Text {
        return this.healthBar.getNameText();
    }

    public reset(): void {
        // Reset health
        this.health = this.maxHealth;
        
        // Reset velocity
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // Reset health bar
        this.healthBar.updateHealth(this.health, this.maxHealth);
        
        // Reset weapon if it exists
        if (this.weapon && 'reset' in this.weapon) {
            (this.weapon as any).reset();
        }
    }

    public getColor(): number {
        return this.stats.color;
    }
} 