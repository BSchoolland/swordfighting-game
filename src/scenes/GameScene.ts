import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { InputManager } from '../systems/InputManager';

export class GameScene extends PIXI.Container {
    private player: Player;
    private enemies: Enemy[] = [];
    private targetCursor: PIXI.Graphics;
    private inputManager: InputManager;
    private worldToScreenScale: number = 1;
    private static readonly MAX_ENEMIES = 12;
    private spawnTimer: number = 0;
    private static readonly SPAWN_INTERVAL = 2000;
    private dimensions: { width: number; height: number };

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

        // Initial enemy spawns
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }
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
            const enemy = new Enemy(this.dimensions, this.player);
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
            this.enemies
        );

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