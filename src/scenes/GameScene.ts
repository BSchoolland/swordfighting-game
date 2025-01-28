import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { InputManager } from '../systems/InputManager';
import { HealthBar } from '../entities/HealthBar';
import { GameOverScreen } from './GameOverScreen';
import { Projectile } from '../entities/projectiles/Projectile';
import { SoundManager } from '../systems/SoundManager';
import { WaveSystem } from '../systems/WaveSystem';
import { Entity } from '../entities/Entity';
import { BossEnemy } from '../entities/enemies/BossEnemy';
import { ParticleSystem } from '../effects/ParticleSystem';
import { BaseWeapon } from '../entities/weapons/BaseWeapon';

export class GameScene extends PIXI.Container {
    private player: Player;
    private enemies: Entity[] = [];
    private projectiles: Projectile[] = [];
    private targetCursor: PIXI.Graphics;
    private inputManager: InputManager;
    private worldToScreenScale: number = 1;
    private dimensions: { width: number; height: number };
    private healthBar: HealthBar;
    private gameOverScreen: GameOverScreen | null = null;
    private isGameOver: boolean = false;
    private soundManager: SoundManager;
    private waveSystem: WaveSystem;
    private bossHealthBar: HealthBar | null = null;
    private bossNameText: PIXI.Text | null = null;
    private freezeFrameTimer: number = 0;
    private static readonly FREEZE_FRAME_DURATION = 75; // 75ms freeze for regular enemy deaths
    private static readonly BOSS_FREEZE_DURATION = 400; // 400ms freeze for boss deaths

    // Wave display
    private waveText: PIXI.Text;
    private waveAnnouncement: PIXI.Text;
    private static readonly WAVE_ANNOUNCEMENT_DURATION = 3000; // 3 seconds to show new wave message
    private waveAnnouncementTimer: number = 0;

    private particleSystem: ParticleSystem;

    constructor(dimensions: { width: number; height: number }) {
        super();
        this.dimensions = dimensions;
        this.inputManager = new InputManager();
        this.soundManager = SoundManager.getInstance();
        
        // Initialize sound system
        this.soundManager.initialize().catch(console.error);

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

        // Initialize wave system
        this.waveSystem = new WaveSystem(dimensions, this.player, this.enemies);

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
                // Update wave system's reference to the new empty array
                this.waveSystem.setEnemiesArray(this.enemies);
                // Start the target wave
                this.waveSystem.setWave(targetWave);
                this.waveText.text = `Wave ${targetWave}`;
                const waveDef = this.waveSystem.getCurrentWaveDefinition();
                this.waveAnnouncement.text = `Wave ${targetWave}\n${waveDef.description}`;
                this.waveAnnouncement.alpha = 1;
                this.waveAnnouncementTimer = 0;
            }
        });

        // Initialize particle system
        this.particleSystem = ParticleSystem.getInstance(this);
    }

    private startWave(waveNumber: number): void {
        // Start the wave in the wave system first
        this.waveSystem.startNextWave();

        // Update wave text
        this.waveText.text = `Wave ${waveNumber}`;
        
        // Play wave start sound
        this.soundManager.playWaveStartSound();
        
        // Heal player by 30% of missing health between waves
        if (waveNumber > 1) {
            const healAmount = Math.floor(30);
            this.player.heal(healAmount);
            this.soundManager.playHealSound();
        }

        // Show wave announcement (now we can safely get the wave definition)
        const waveDef = this.waveSystem.getCurrentWaveDefinition();
        this.waveAnnouncement.text = `Wave ${waveNumber}\n${waveDef.description}`;
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

        this.isGameOver = false;
        
        // Reinitialize wave system
        this.waveSystem = new WaveSystem(this.dimensions, this.player, this.enemies);
        this.startWave(1);
    }

    private showGameOver(): void {
        this.isGameOver = true;
        this.gameOverScreen = new GameOverScreen(this.dimensions.width, this.dimensions.height);
        this.addChild(this.gameOverScreen);
        this.soundManager.playGameOverSound();
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

    private updateBossUI(): void {
        // Remove old boss UI if it exists
        if (this.bossHealthBar && this.bossHealthBar.parent) {
            this.removeChild(this.bossHealthBar);
            this.bossHealthBar = null;
        }
        if (this.bossNameText && this.bossNameText.parent) {
            this.removeChild(this.bossNameText);
            this.bossNameText = null;
        }

        // Find boss in enemies array
        const boss = this.enemies.find(enemy => enemy instanceof BossEnemy) as BossEnemy | undefined;
        if (boss) {
            // Add boss UI elements
            this.bossHealthBar = boss.getHealthBar();
            this.bossNameText = boss.getNameText();
            this.addChild(this.bossHealthBar);
            this.addChild(this.bossNameText);
        }
    }

    public update(delta: number): void {
        if (delta === undefined) {
            delta = 1/60;
        }

        // Handle freeze frames
        if (this.freezeFrameTimer > 0) {
            this.freezeFrameTimer -= delta * 1000;
            return; // Skip update during freeze frame
        }

        if (this.isGameOver) return;

        // Handle wave announcement fade out
        if (this.waveAnnouncement.alpha > 0) {
            const deltaMs = Math.min(delta * 1000, 100);
            this.waveAnnouncementTimer += deltaMs;
            
            if (this.waveAnnouncementTimer >= GameScene.WAVE_ANNOUNCEMENT_DURATION) {
                this.waveAnnouncement.alpha = 0;
            } else {
                // Fade out gradually during the last second
                const fadeStartTime = GameScene.WAVE_ANNOUNCEMENT_DURATION - 1000;
                if (this.waveAnnouncementTimer > fadeStartTime) {
                    this.waveAnnouncement.alpha = 1 - (this.waveAnnouncementTimer - fadeStartTime) / 1000;
                }
            }
        }

        // Update wave system
        this.waveSystem.update(delta);

        // Add any new enemies to the scene
        for (const enemy of this.enemies) {
            if (!enemy.parent) {
                this.addChild(enemy);
            }
        }

        // Check for wave completion and start next wave
        if (!this.waveSystem.isWaveActive() && this.enemies.length === 0) {
            console.log(`Wave ${this.waveSystem.getCurrentWave()} complete! Starting next wave.`);
            this.startWave(this.waveSystem.getCurrentWave() + 1);
        }

        // Get input vectors
        const movement = this.inputManager.getMovementVector();
        const aim = this.inputManager.getAimDirection();
        
        // Update target cursor position based on input type
        if (this.inputManager.isUsingGamepad()) {
            // For gamepad, position relative to player
            const aimDistance = 100;
            this.targetCursor.position.set(
                this.player.x + aim.x * aimDistance,
                this.player.y + aim.y * aimDistance
            );
        } else {
            // For mouse, use exact mouse position in world space
            const mousePos = this.screenToWorldSpace(
                this.inputManager.getMousePosition().x,
                this.inputManager.getMousePosition().y
            );
            this.targetCursor.position.set(mousePos.x, mousePos.y);
        }

        // Update player with new input methods
        this.player.update(
            delta,
            this.inputManager.getKeys(),
            this.targetCursor.x,
            this.targetCursor.y,
            this.inputManager.isDashActive(),
            [...this.enemies, ...this.projectiles.filter(p => p.isAlive())],
            this.inputManager.isAttacking()
        );

        // Update health bar
        this.healthBar.updateHealth(this.player.getHealth(), this.player.getMaxHealth());

        // Update boss UI
        this.updateBossUI();

        // Check for game over
        if (!this.player.isAlive() && !this.isGameOver) {
            this.showGameOver();
            return;
        }

        // Update enemies and remove dead ones
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy instanceof BaseEnemy) {
                enemy.playerIsAttacking = this.inputManager.isAttacking();
                enemy.update(delta, this.projectiles.filter(p => p.isAlive()));
                if (!enemy.isAlive()) {
                    this.handleEnemyDeath(enemy);
                    this.removeChild(enemy);
                    this.enemies.splice(i, 1);
                }
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

        // Update particle effects
        this.particleSystem.update(delta);
    }

    private handleEnemyDeath(enemy: BaseEnemy): void {
        // Create death effect before removing the enemy
        if (enemy instanceof BossEnemy) {
            this.particleSystem.createBossDeathEffect(enemy.x, enemy.y, enemy.getColor());
            this.freezeFrameTimer = GameScene.BOSS_FREEZE_DURATION;
            // Play boss death sound if available
            this.soundManager.playBossDeathSound?.();
        } else {
            this.particleSystem.createDeathEffect(enemy.x, enemy.y, enemy.getColor());
            this.freezeFrameTimer = GameScene.FREEZE_FRAME_DURATION;
        }
    }

    private handleHit(target: Entity, weapon: BaseWeapon): void {
        // Create hit sparks
        this.particleSystem.createHitSparks(target.x, target.y, weapon.getColor());
    }
} 