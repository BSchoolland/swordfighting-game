import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { BasicEnemy } from '../entities/enemies/BasicEnemy';
import { FastEnemy } from '../entities/enemies/FastEnemy';
import { TankEnemy } from '../entities/enemies/TankEnemy';
import { RangedEnemy } from '../entities/enemies/RangedEnemy';
import { InputManager } from '../systems/InputManager';
import { HealthBar } from '../entities/HealthBar';
import { GameOverScreen } from './GameOverScreen';
import { Projectile } from '../entities/projectiles/Projectile';

interface WaveConfig {
    basicEnemyChance: number;
    fastEnemyChance: number;
    tankEnemyChance: number;
    rangedEnemyChance: number;
    totalEnemies: number;
    spawnInterval: number;
}

export class GameScene extends PIXI.Container {
    private player: Player;
    private enemies: BaseEnemy[] = [];
    private projectiles: Projectile[] = [];
    private targetCursor: PIXI.Graphics;
    private inputManager: InputManager;
    private worldToScreenScale: number = 1;
    private static readonly MAX_ENEMIES = 10;
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
    private waveAnnouncement: PIXI.Text;
    private static readonly WAVE_ANNOUNCEMENT_DURATION = 3000; // 3 seconds to show new wave message
    private waveAnnouncementTimer: number = 0;
    private canSpawnEnemies: boolean = false;

    private getWaveConfig(wave: number): WaveConfig {
        // Base configuration with only basic enemies initially
        const config: WaveConfig = {
            basicEnemyChance: 1.0,
            fastEnemyChance: 0,
            tankEnemyChance: 0,
            rangedEnemyChance: 0,
            totalEnemies: wave + Math.floor(wave * 3),
            spawnInterval: Math.max(500, 2000 - wave * 100) // Gets faster each wave, minimum 500ms
        };

        // Wave 2: Introduce Fast Enemies
        if (wave >= 2) {
            config.basicEnemyChance = 0.7;
            config.fastEnemyChance = 0.3;
        }

        // Wave 3: Introduce Ranged Enemies
        if (wave >= 3) {
            config.basicEnemyChance = 0.5;
            config.fastEnemyChance = 0.25;
            config.rangedEnemyChance = 0.25;
        }

        // Wave 4: Introduce Tank Enemies
        if (wave >= 4) {
            config.basicEnemyChance = 0.4;
            config.fastEnemyChance = 0.25;
            config.tankEnemyChance = 0.15;
            config.rangedEnemyChance = 0.2;
        }

        // After wave 5, gradually increase harder enemies
        if (wave > 5) {
            config.basicEnemyChance = Math.max(0.25, 0.4 - (wave - 5) * 0.02);
            config.fastEnemyChance = Math.min(0.3, 0.25 + (wave - 5) * 0.01);
            config.tankEnemyChance = Math.min(0.2, 0.15 + (wave - 5) * 0.005);
            config.rangedEnemyChance = Math.min(0.25, 0.2 + (wave - 5) * 0.005);
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

        // Create wave text (top right corner)
        this.waveText = new PIXI.Text('Wave 1', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
        });
        this.waveText.position.set(dimensions.width - 150, 20);
        this.addChild(this.waveText);

        // Create centered wave announcement text
        this.waveAnnouncement = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xffffff,
            align: 'center'
        });
        this.waveAnnouncement.anchor.set(0.5);
        this.waveAnnouncement.position.set(dimensions.width / 2, dimensions.height / 2);
        this.waveAnnouncement.alpha = 0;
        this.addChild(this.waveAnnouncement);

        // Start first wave
        this.startWave(1);

        // Listen for restart and debug keys
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR' && this.isGameOver) {
                this.restart();
            }
            // Debug: Skip to wave number using number keys (1-9)
            const waveMatch = e.code.match(/Digit([1-9])/);
            if (waveMatch) {
                const targetWave = parseInt(waveMatch[1]);
                console.log(`Debug: Skipping to wave ${targetWave}`);
                // Clear current enemies
                this.enemies.forEach(enemy => this.removeChild(enemy));
                this.enemies = [];
                this.enemiesRemainingInWave = 0;
                // Start the target wave
                this.startWave(targetWave);
            }
        });
    }

    private startWave(waveNumber: number): void {
        this.currentWave = waveNumber;
        const config = this.getWaveConfig(waveNumber);
        this.enemiesRemainingInWave = config.totalEnemies;
        this.waveComplete = false;
        this.spawnTimer = 0;
        this.waveText.text = `Wave ${waveNumber}`;
        this.canSpawnEnemies = false;
        
        // Heal player by 30% of missing health between waves
        if (waveNumber > 1) {
            const healAmount = Math.floor(30);
            this.player.heal(healAmount);
        }

        // Show wave announcement
        this.waveAnnouncement.text = `Wave ${waveNumber}`;
        this.waveAnnouncement.alpha = 1;
        this.waveAnnouncementTimer = 0;
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
            } else if (roll < config.tankEnemyChance + config.fastEnemyChance + config.rangedEnemyChance) {
                enemy = new RangedEnemy(this.dimensions, this.player);
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

    public addProjectile(projectile: Projectile): void {
        this.projectiles.push(projectile);
        this.addChild(projectile);
    }

    public update(delta: number): void {
        if (delta === undefined) {
            delta = 1/60;
        }

        if (this.isGameOver) return;

        // Handle wave announcement fade out
        if (this.waveAnnouncement.alpha > 0) {
            const deltaMs = Math.min(delta * 1000, 100);
            this.waveAnnouncementTimer += deltaMs;
            
            if (this.waveAnnouncementTimer >= GameScene.WAVE_ANNOUNCEMENT_DURATION) {
                this.waveAnnouncement.alpha = 0;
                // Start spawning enemies when announcement ends
                if (!this.canSpawnEnemies) {
                    this.canSpawnEnemies = true;
                    // Initial spawn of enemies
                    const config = this.getWaveConfig(this.currentWave);
                    const initialSpawns = Math.min(5, config.totalEnemies);
                    for (let i = 0; i < initialSpawns; i++) {
                        this.spawnEnemy();
                    }
                }
            } else {
                // Fade out gradually during the last second
                const fadeStartTime = GameScene.WAVE_ANNOUNCEMENT_DURATION - 1000;
                if (this.waveAnnouncementTimer > fadeStartTime) {
                    this.waveAnnouncement.alpha = 1 - (this.waveAnnouncementTimer - fadeStartTime) / 1000;
                }
            }
        }

        // Add regular enemy spawning
        if (this.canSpawnEnemies && this.enemiesRemainingInWave > 0) {
            const deltaMs = Math.min(delta * 1000, 100);
            this.spawnTimer += deltaMs;
            
            const config = this.getWaveConfig(this.currentWave);
            const spawnInterval = config.spawnInterval || GameScene.DEFAULT_SPAWN_INTERVAL;
            
            if (this.spawnTimer >= spawnInterval) {
                this.spawnTimer = 0;
                this.spawnEnemy();
            }
        }

        // Debug log wave state
        if (this.currentWave === 3) {
            console.log(`Wave 3 state - Enemies alive: ${this.enemies.length}, Remaining to spawn: ${this.enemiesRemainingInWave}`);
        }

        // Check for wave completion and start next wave immediately
        if (!this.waveComplete && this.enemies.length === 0 && this.enemiesRemainingInWave === 0) {
            console.log(`Wave ${this.currentWave} complete! Starting next wave.`);
            this.startWave(this.currentWave + 1);
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
            [...this.enemies, ...this.projectiles.filter(p => p.isAlive())],
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
            // Pass projectiles to enemy's update for weapon targeting
            enemy.update(delta, this.projectiles.filter(p => p.isAlive()));
            if (!enemy.isAlive()) {
                this.removeChild(enemy);
                this.enemies.splice(i, 1);
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            if (projectile.isAlive()) {
                projectile.update(delta, [this.player, ...this.enemies]);
            } else {
                this.removeChild(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }
} 