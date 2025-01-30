import * as PIXI from 'pixi.js';
import { Player } from '../Player';
import { BaseEnemy, EnemyStats } from './BaseEnemy';
import { Entity } from '../Entity';
import { HealthBar } from '../HealthBar';

export abstract class BossEnemy extends BaseEnemy {
    protected healthBar: HealthBar;
    protected static readonly BOSS_HEALTH_BAR_WIDTH = 300;
    protected static readonly BOSS_HEALTH_BAR_HEIGHT = 20;
    protected bossName: string;
    private nameText: PIXI.Text;

    constructor(bounds: { width: number; height: number }, player: Player, stats: EnemyStats, name: string) {
        super(bounds, player, stats);
        this.bossName = name;
        
        // Create health bar with red color
        this.healthBar = new HealthBar(BossEnemy.BOSS_HEALTH_BAR_WIDTH, BossEnemy.BOSS_HEALTH_BAR_HEIGHT, 0xff0000);
        this.healthBar.position.set(
            (bounds.width - BossEnemy.BOSS_HEALTH_BAR_WIDTH) / 2,
            20 // Position at top of screen with some padding
        );

        // Create boss name text
        this.nameText = new PIXI.Text(this.bossName, {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xff0000,
            align: 'center'
        });
        this.nameText.anchor.set(0.5, 1); // Center horizontally, align bottom with health bar
        this.nameText.position.set(
            bounds.width / 2,
            this.healthBar.position.y - 5
        );
    }

    public update(delta: number, targets: Entity[] = []): void {
        super.update(delta, targets);
        this.healthBar.updateHealth(this.health, this.maxHealth);
    }

    public onAddedToScene(): void {
        // Get the root scene container (parent of our parent)
        const scene = this.parent?.parent;
        if (scene) {
            if (!this.healthBar.parent) {
                scene.addChild(this.healthBar);
            }
            if (!this.nameText.parent) {
                scene.addChild(this.nameText);
            }
        }
    }

    public onRemovedFromScene(): void {
        if (this.healthBar.parent) {
            this.healthBar.parent.removeChild(this.healthBar);
        }
        if (this.nameText.parent) {
            this.nameText.parent.removeChild(this.nameText);
        }
    }

    // Expose UI elements for GameScene to use
    public getHealthBar(): HealthBar {
        return this.healthBar;
    }

    public getNameText(): PIXI.Text {
        return this.nameText;
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
} 