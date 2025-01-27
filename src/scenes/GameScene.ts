import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { BasicEnemy } from '../entities/enemies/BasicEnemy';
import { FastEnemy } from '../entities/enemies/FastEnemy';
import { TankEnemy } from '../entities/enemies/TankEnemy';
import { InputManager } from '../systems/InputManager';
import { HealthBar } from '../entities/HealthBar';
import { GameOverScreen } from './GameOverScreen';

interface WaveConfig {
    basicEnemyChance: number;
    fastEnemyChance: number;
    tankEnemyChance: number;
    totalEnemies: number;
    spawnInterval: number;
}

export class GameScene extends PIXI.Container {
    private player: Player;
    private enemies: BaseEnemy[] = [];
    private targetCursor: PIXI.Graphics;
    private inputManager: InputManager;
    private worldToScreenScale: number = 1;
    private static readonly MAX_ENEMIES = 15;
    private spawnTimer: number = 0;
    private static readonly DEFAULT_SPAWN_INTERVAL = 2000;
    private dimensions: { width: number; height: number };
    private healthBar: HealthBar;
    private gameOverScreen: GameOverScreen | null = null;
    private isGameOver: boolean = false;

    // Wave system
    private currentWave: number = 1;
    private enemiesRemainingInWave: number = 0;
    private waveComplete: boolean = false;
    private waveText: PIXI.Text;
    private static readonly WAVE_BREAK_DURATION = 5000; // 5 seconds between waves
    private waveBreakTimer: number = 0;

    private getWaveConfig(wave: number): WaveConfig {
        // Base configuration
        const config: WaveConfig = {
            basicEnemyChance: 0.5,
            fastEnemyChance: 0.3,
            tankEnemyChance: 0.2,
            totalEnemies: 10 + Math.floor(wave * 2), // Increases by 2 each wave
            spawnInterval: Math.max(500, 2000 - wave * 100) // Gets faster each wave, minimum 500ms
        };

        // Adjust enemy distribution based on wave
        if (wave > 5) {
            // After wave 5, gradually increase harder enemies
            config.basicEnemyChance = Math.max(0.3, 0.5 - (wave - 5) * 0.02);
            config.fastEnemyChance = Math.min(0.4, 0.3 + (wave - 5) * 0.01);
            config.tankEnemyChance = Math.min(0.3, 0.2 + (wave - 5) * 0.01);
        }

        return config;
    }

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

        // Create wave text
        this.waveText = new PIXI.Text('Wave 1', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
        });
        this.waveText.position.set(dimensions.width - 150, 20);
        this.addChild(this.waveText);

        // Start first wave
        this.startWave(1);

        // Listen for restart
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR' && this.isGameOver) {
                this.restart();
            }
        });
    }

    private startWave(waveNumber: number): void {
        this.currentWave = waveNumber;
        const config = this.getWaveConfig(waveNumber);
        this.enemiesRemainingInWave = config.totalEnemies;
        this.waveComplete = false;
        this.spawnTimer = 0; // Reset spawn timer at wave start
        this.waveText.text = `Wave ${waveNumber}`;
        
        // Initial spawn of enemies
        const initialSpawns = Math.min(5, config.totalEnemies);
        for (let i = 0; i < initialSpawns; i++) {
            this.spawnEnemy();
        }
    }

    private restart(): void {
        if (this.gameOverScreen) {
            this.removeChild(this.gameOverScreen);
            this.gameOverScreen = null;
        }

        this.player.reset();
        this.player.x = this.dimensions.width / 2;
        this.player.y = this.dimensions.height / 2;

        this.enemies.forEach(enemy => this.removeChild(enemy));
        this.enemies = [];

        this.currentWave = 1;
        this.isGameOver = false;
        this.waveComplete = false;
        this.waveBreakTimer = 0;
        this.spawnTimer = 0; // Reset spawn timer on restart
        
        this.startWave(1);
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
        if (this.enemies.length < GameScene.MAX_ENEMIES && this.enemiesRemainingInWave > 0) {
            const config = this.getWaveConfig(this.currentWave);
            let enemy: BaseEnemy;
            const roll = Math.random();
            
            if (roll < config.tankEnemyChance) {
                enemy = new TankEnemy(this.dimensions, this.player);
            } else if (roll < config.tankEnemyChance + config.fastEnemyChance) {
                enemy = new FastEnemy(this.dimensions, this.player);
            } else {
                enemy = new BasicEnemy(this.dimensions, this.player);
            }
            
            this.enemies.push(enemy);
            this.addChild(enemy);
            this.enemiesRemainingInWave--;
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
        // Safeguard against undefined delta
        if (delta === undefined) {
            delta = 1/60;
        }

        if (this.isGameOver) return;

        // Handle wave breaks
        if (this.waveComplete) {
            // delta is in seconds, convert to ms and ensure it's not too large
            const deltaMs = Math.min(delta * 1000, 100); // Cap at 100ms to prevent huge jumps
            this.waveBreakTimer += deltaMs;
            
            
            if (this.waveBreakTimer >= GameScene.WAVE_BREAK_DURATION) {
                this.waveBreakTimer = 0;
                this.waveComplete = false; // Reset wave complete flag
                this.startWave(this.currentWave + 1);
            } else {
                // Show wave complete message during break
                const secondsRemaining = Math.ceil((GameScene.WAVE_BREAK_DURATION - this.waveBreakTimer) / 1000);
                this.waveText.text = `Wave ${this.currentWave} Complete!\nNext wave in ${secondsRemaining}...`;
            }
            return; // Don't process other updates during wave break
        }

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

                // Check wave completion after each enemy death
                if (this.enemies.length === 0 && this.enemiesRemainingInWave === 0) {
                    this.waveComplete = true;
                    this.waveBreakTimer = 0;
                }
            }
        }

        // Handle enemy spawning during waves
        if (!this.waveComplete && this.enemiesRemainingInWave > 0) {
            const config = this.getWaveConfig(this.currentWave);
            const spawnInterval = config.spawnInterval || GameScene.DEFAULT_SPAWN_INTERVAL;
            const deltaMs = Math.min(delta * 1000, 100); // Cap at 100ms to prevent huge jumps
            
            
            
            if (typeof this.spawnTimer !== 'number') {
                this.spawnTimer = 0;
            }
            
            this.spawnTimer += deltaMs;
            
            if (this.spawnTimer >= spawnInterval) {
                this.spawnTimer = 0;
                this.spawnEnemy();
            }
        }

        // Check for wave completion after all updates
        if (!this.waveComplete && this.enemies.length === 0 && this.enemiesRemainingInWave === 0) {
            this.waveComplete = true;
            this.waveBreakTimer = 0;
        }
    }
} 