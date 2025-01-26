import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { BasicEnemy } from '../entities/enemies/BasicEnemy';
import { FastEnemy } from '../entities/enemies/FastEnemy';
import { TankEnemy } from '../entities/enemies/TankEnemy';
import { InputManager } from '../systems/InputManager';
import { HealthBar } from '../entities/HealthBar';
import { GameOverScreen } from './GameOverScreen';

export class GameScene extends PIXI.Container {
    private player: Player;
    private enemies: BaseEnemy[] = [];
    private targetCursor: PIXI.Graphics;
    private inputManager: InputManager;
    private worldToScreenScale: number = 1;
    private static readonly MAX_ENEMIES = 12;
    private spawnTimer: number = 0;
    private static readonly SPAWN_INTERVAL = 2000;
    private dimensions: { width: number; height: number };
    private healthBar: HealthBar;
    private gameOverScreen: GameOverScreen | null = null;
    private isGameOver: boolean = false;

    constructor(dimensions: { width: number; height: number }) {
        super();
        this.dimensions = dimensions;
        this.inputManager = new InputManager();

        // Create player with fixed game world bounds
        this.player = new Player(dimensions);
        this.player.x = dimensions.width / 2;
        this.player.y = dimensions.height / 2;
        this.addChild(this.player);

        // Create target cursor
        this.targetCursor = new PIXI.Graphics();
        this.drawCursor();
        this.addChild(this.targetCursor);

        // Create health bar
        this.healthBar = new HealthBar(200, 20);
        this.healthBar.position.set(20, 20);
        this.addChild(this.healthBar);

        // Initial enemy spawns
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }

        // Listen for restart
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR' && this.isGameOver) {
                this.restart();
            }
        });
    }

    private restart(): void {
        // Remove game over screen
        if (this.gameOverScreen) {
            this.removeChild(this.gameOverScreen);
            this.gameOverScreen = null;
        }

        // Reset player
        this.player.reset();
        this.player.x = this.dimensions.width / 2;
        this.player.y = this.dimensions.height / 2;

        // Clear enemies
        this.enemies.forEach(enemy => this.removeChild(enemy));
        this.enemies = [];

        // Spawn initial enemies
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }

        this.isGameOver = false;
    }

    private showGameOver(): void {
        this.isGameOver = true;
        this.gameOverScreen = new GameOverScreen(this.dimensions.width, this.dimensions.height);
        this.addChild(this.gameOverScreen);
    }

    private drawCursor(): void {
        this.targetCursor.clear();
        this.targetCursor.lineStyle(2, 0xff0000);
        this.targetCursor.drawCircle(0, 0, 5);
        this.targetCursor.moveTo(-8, 0);
        this.targetCursor.lineTo(8, 0);
        this.targetCursor.moveTo(0, -8);
        this.targetCursor.lineTo(0, 8);
    }

    private spawnEnemy(): void {
        if (this.enemies.length < GameScene.MAX_ENEMIES) {
            let enemy: BaseEnemy;
            const roll = Math.random();
            
            if (roll < 0.2) { // 20% chance for tank
                enemy = new TankEnemy(this.dimensions, this.player);
            } else if (roll < 0.5) { // 30% chance for fast
                enemy = new FastEnemy(this.dimensions, this.player);
            } else { // 50% chance for basic
                enemy = new BasicEnemy(this.dimensions, this.player);
            }
            
            this.enemies.push(enemy);
            this.addChild(enemy);
        }
    }

    public setWorldToScreenScale(scale: number): void {
        this.worldToScreenScale = scale;
    }

    private screenToWorldSpace(screenX: number, screenY: number): { x: number, y: number } {
        const globalPos = this.getGlobalPosition();
        return {
            x: (screenX - globalPos.x) / this.worldToScreenScale,
            y: (screenY - globalPos.y) / this.worldToScreenScale
        };
    }

    public update(delta: number): void {
        if (this.isGameOver) return;

        // Convert mouse position to world space
        const mousePos = this.inputManager.getMousePosition();
        const worldPos = this.screenToWorldSpace(mousePos.x, mousePos.y);
        
        // Update target cursor position
        this.targetCursor.position.set(worldPos.x, worldPos.y);
        
        // Update player
        this.player.update(
            delta,
            this.inputManager.getKeys(),
            worldPos.x,
            worldPos.y,
            this.inputManager.isDashActive(),
            this.enemies,
            this.inputManager.isAttacking()
        );

        // Update health bar
        this.healthBar.updateHealth(this.player.getHealth(), this.player.getMaxHealth());

        // Check for game over
        if (!this.player.isAlive() && !this.isGameOver) {
            this.showGameOver();
            return;
        }

        // Update enemies and remove dead ones
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(delta);
            if (!enemy.isAlive()) {
                this.removeChild(enemy);
                this.enemies.splice(i, 1);
            }
        }

        // Handle enemy spawning
        this.spawnTimer += delta;
        if (this.spawnTimer >= GameScene.SPAWN_INTERVAL) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }
    }
} 