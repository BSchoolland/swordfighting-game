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

import { UpgradeSystem } from '../systems/UpgradeSystem';
import { MasterOfArmsBoss } from '../entities/enemies/MasterOfArmsBoss';
import { HomeScreen } from './HomeScreen';
import { ScoreSystem } from '../systems/ScoreSystem';
import { AdManager } from '../systems/AdManager';

export class GameScene extends PIXI.Container {
    private player: Player;
    private enemies: Entity[] = [];
    private projectiles: Projectile[] = [];
    private targetCursor!: PIXI.Graphics;
    private inputManager: InputManager;
    private worldToScreenScale: number = 1;
    private dimensions: { width: number; height: number };
    private healthBar!: HealthBar;
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
    private waveText!: PIXI.Text;
    private waveAnnouncement!: PIXI.Text;
    private static readonly WAVE_ANNOUNCEMENT_DURATION = 3000; // 3 seconds to show new wave message
    private waveAnnouncementTimer: number = 0;
    private scoreText!: PIXI.Text; // Add score text

    private particleSystem: ParticleSystem;
    private upgradeSystem: UpgradeSystem;

    private homeScreen: HomeScreen | null = null;
    private gameStarted: boolean = false;
    private waitingForUpgrade: boolean = false;

    private scoreSystem: ScoreSystem;
    private adManager: AdManager;

    constructor(dimensions: { width: number; height: number }) {
        super();
        this.dimensions = dimensions;
        this.inputManager = new InputManager();
        this.soundManager = SoundManager.getInstance();
        this.adManager = AdManager.getInstance();
        
        // Initialize score system
        this.scoreSystem = new ScoreSystem();
        
        // Initialize sound system
        this.soundManager.initialize().catch(console.error);

        // Show home screen initially
        this.showHomeScreen();

        // Initialize particle system
        this.particleSystem = ParticleSystem.getInstance(this);

        // Initialize player first
        this.player = new Player(dimensions);
        this.addChild(this.player);

        // make player invisible by moving far offscreen
        this.player.position.set(-1000, -1000);
        
        // Initialize upgrade system before wave system
        this.upgradeSystem = new UpgradeSystem(dimensions, this.player);
        this.addChild(this.upgradeSystem);

        // Initialize wave system with upgrade system
        this.waveSystem = new WaveSystem(dimensions, this.player, this.enemies, this.upgradeSystem);
    }

    private async showHomeScreen(): Promise<void> {
        console.log('[GameScene] Showing home screen');
        
        // Notify gameplay stop if coming from gameplay
        if (this.gameStarted) {
            await this.adManager.notifyGameplayStop();
        }

        // Remove game over screen if it exists
        if (this.gameOverScreen) {
            console.log('[GameScene] Removing game over screen');
            this.removeChild(this.gameOverScreen);
            this.gameOverScreen = null;
        }

        // Clear all game elements first
        console.log('[GameScene] Clearing game state for menu');
        if (this.player) {
            this.removeChild(this.player);
        }
        this.enemies.forEach(enemy => this.removeChild(enemy));
        this.enemies = [];
        this.projectiles.forEach(projectile => this.removeChild(projectile));
        this.projectiles = [];
        if (this.targetCursor) {
            this.removeChild(this.targetCursor);
        }
        if (this.healthBar) {
            this.removeChild(this.healthBar);
        }
        if (this.waveText) {
            this.removeChild(this.waveText);
        }
        if (this.scoreText) {
            this.removeChild(this.scoreText);
        }
        if (this.waveAnnouncement) {
            this.removeChild(this.waveAnnouncement);
        }
        if (this.upgradeSystem) {
            this.removeChild(this.upgradeSystem);
        }
        if (this.bossHealthBar) {
            this.removeChild(this.bossHealthBar);
            this.bossHealthBar = null;
        }
        if (this.bossNameText) {
            this.removeChild(this.bossNameText);
            this.bossNameText = null;
        }
        
        // Reset game state
        this.isGameOver = false;
        this.gameStarted = false;
        this.waitingForUpgrade = false;
        
        // Reinitialize core systems
        console.log('[GameScene] Reinitializing systems for menu');
        this.player = new Player(this.dimensions);
        this.addChild(this.player);
        // Move player off screen initially
        this.player.position.set(-1000, -1000);
        
        this.upgradeSystem = new UpgradeSystem(this.dimensions, this.player);
        this.addChild(this.upgradeSystem);
        
        this.waveSystem = new WaveSystem(this.dimensions, this.player, this.enemies, this.upgradeSystem);
        
        // Reset score system
        this.scoreSystem.reset();
        
        // Show the home screen
        console.log('[GameScene] Creating home screen');
        this.homeScreen = new HomeScreen(this.dimensions, async () => {
            await this.startGame();
        });
        this.addChild(this.homeScreen);
    }

    private async startGame(): Promise<void> {
        console.log('[GameScene] Starting game');

        // Notify gameplay start
        await this.adManager.notifyGameplayStart();

        // Reset game state
        this.isGameOver = false;
        this.gameStarted = true;
        this.waitingForUpgrade = false;

        // Reset score system
        this.scoreSystem.reset();

        // Clear all existing entities and UI elements
        this.enemies.forEach(enemy => this.removeChild(enemy));
        this.enemies = [];
        this.projectiles.forEach(projectile => this.removeChild(projectile));
        this.projectiles = [];

        // Reset player position and state
        this.player.reset();
        this.player.position.set(this.dimensions.width / 2, this.dimensions.height / 2);

        // Reset wave system
        this.waveSystem = new WaveSystem(this.dimensions, this.player, this.enemies, this.upgradeSystem);

        // Remove home screen if it exists
        if (this.homeScreen) {
            console.log('[GameScene] Removing home screen');
            this.removeChild(this.homeScreen);
            this.homeScreen = null;
        }

        // Remove any existing UI elements
        if (this.targetCursor) {
            this.removeChild(this.targetCursor);
        }
        if (this.healthBar) {
            this.removeChild(this.healthBar);
        }
        if (this.waveText) {
            this.removeChild(this.waveText);
        }
        if (this.scoreText) {
            this.removeChild(this.scoreText);
        }
        if (this.waveAnnouncement) {
            this.removeChild(this.waveAnnouncement);
        }
        if (this.bossHealthBar) {
            this.removeChild(this.bossHealthBar);
            this.bossHealthBar = null;
        }
        if (this.bossNameText) {
            this.removeChild(this.bossNameText);
            this.bossNameText = null;
        }

        // Reset music to normal background music
        this.soundManager.transitionToNormalMusic();

        // Create target cursor
        console.log('[GameScene] Creating target cursor');
        this.targetCursor = new PIXI.Graphics();
        this.drawCursor();
        this.addChild(this.targetCursor);

        // Create health bar
        console.log('[GameScene] Creating health bar');
        this.healthBar = new HealthBar(200, 20);
        this.healthBar.position.set(20, 20);
        this.addChild(this.healthBar);

        // Create wave text (top right corner)
        console.log('[GameScene] Creating wave text');
        this.waveText = new PIXI.Text('Wave 1', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
        });
        this.waveText.position.set(this.dimensions.width - 150, 20);
        this.addChild(this.waveText);

        // Create score text under wave text
        console.log('[GameScene] Creating score text');
        this.scoreText = new PIXI.Text('Score: 0', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xFFD700,
            align: 'center'
        });
        this.scoreText.position.set(this.dimensions.width - 150, 50);
        this.addChild(this.scoreText);

        // Create centered wave announcement text
        console.log('[GameScene] Creating wave announcement');
        this.waveAnnouncement = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xffffff,
            align: 'center'
        });
        this.waveAnnouncement.anchor.set(0.5);
        this.waveAnnouncement.position.set(this.dimensions.width / 2, this.dimensions.height / 2);
        this.waveAnnouncement.alpha = 0;
        this.addChild(this.waveAnnouncement);

        // Start first wave
        console.log('[GameScene] Starting first wave');
        this.startWave(1);
    }

    private startWave(waveNumber: number): void {
        // Don't start wave if waiting for upgrade selection
        if (this.waitingForUpgrade) {
            return;
        }

        // Update score system with new wave
        this.scoreSystem.setWave(waveNumber);

        // Start the wave in the wave system first
        this.waveSystem.startNextWave();

        // Update wave text
        this.waveText.text = `Wave ${waveNumber}`;
        
        // Play wave start sound
        this.soundManager.playWaveStartSound();
        
        // Show wave announcement (now we can safely get the wave definition)
        const waveDef = this.waveSystem.getCurrentWaveDefinition();
        this.waveAnnouncement.text = `Wave ${waveNumber}\n${waveDef.description}`;
        this.waveAnnouncement.alpha = 1;
        this.waveAnnouncementTimer = 0;
    }

    private async restart(): Promise<void> {
        console.log('[GameScene] Starting restart process');
        if (this.gameOverScreen) {
            console.log('[GameScene] Removing game over screen');
            this.removeChild(this.gameOverScreen);
            this.gameOverScreen = null;
        }

        // Reset score system
        this.scoreSystem.reset();

        // Clear existing game elements
        console.log('[GameScene] Clearing game elements');
        if (this.player) {
            console.log('[GameScene] Removing player');
            this.removeChild(this.player);
        }
        console.log('[GameScene] Removing enemies:', this.enemies.length);
        this.enemies.forEach(enemy => this.removeChild(enemy));
        this.enemies = [];
        if (this.targetCursor) {
            console.log('[GameScene] Removing target cursor');
            this.removeChild(this.targetCursor);
        }
        if (this.healthBar) {
            console.log('[GameScene] Removing health bar');
            this.removeChild(this.healthBar);
        }
        if (this.waveText) {
            console.log('[GameScene] Removing wave text');
            this.removeChild(this.waveText);
        }
        if (this.scoreText) {
            console.log('[GameScene] Removing score text');
            this.removeChild(this.scoreText);
        }
        if (this.waveAnnouncement) {
            console.log('[GameScene] Removing wave announcement');
            this.removeChild(this.waveAnnouncement);
        }
        if (this.upgradeSystem) {
            console.log('[GameScene] Removing upgrade system');
            this.removeChild(this.upgradeSystem);
        }

        // Reset game state
        console.log('[GameScene] Resetting game state');
        this.isGameOver = false;
        
        // Reinitialize core systems
        console.log('[GameScene] Reinitializing core systems');
        
        // Reinitialize player
        console.log('[GameScene] Reinitializing player');
        this.player = new Player(this.dimensions);
        this.addChild(this.player);
        
        // Reinitialize upgrade system
        console.log('[GameScene] Reinitializing upgrade system');
        this.upgradeSystem = new UpgradeSystem(this.dimensions, this.player);
        this.addChild(this.upgradeSystem);
        
        // Reinitialize wave system
        console.log('[GameScene] Reinitializing wave system');
        this.waveSystem = new WaveSystem(this.dimensions, this.player, this.enemies, this.upgradeSystem);
        
        // Start game immediately instead of showing home screen
        console.log('[GameScene] Starting new game');
        await this.startGame();
    }

    private async showGameOver(): Promise<void> {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        this.gameStarted = false;

        // Notify gameplay stop
        await this.adManager.notifyGameplayStop();

        // Create and show game over screen
        this.gameOverScreen = new GameOverScreen(
            this.dimensions.width,
            this.dimensions.height,
            async () => {
                // Show ad before restarting
                await this.adManager.showAd();
                await this.restart();
            },
            async () => this.showHomeScreen(),
            this.scoreSystem
        );
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
            
            // Ensure health bar is centered
            if (this.bossHealthBar) {
                const healthBarWidth = 300; // Same width as BossEnemy.BOSS_HEALTH_BAR_WIDTH
                this.bossHealthBar.position.x = (this.dimensions.width - healthBarWidth) / 2;
                this.bossHealthBar.position.y = 40; // Moved down from 20 to 40
            }
            
            // Ensure name text is centered above health bar
            if (this.bossNameText) {
                this.bossNameText.position.set(
                    this.dimensions.width / 2,
                    35 // Moved down from 15 to 35
                );
            }
            
            this.addChild(this.bossHealthBar);
            this.addChild(this.bossNameText);
        }
    }

    public update(delta: number): void {

        // Skip updates if game hasn't started
        if (!this.gameStarted) return;

        // Skip updates if upgrade screen is visible
        if (this.upgradeSystem.isUpgradeScreenVisible()) {
            return;
        }

        // Handle freeze frames
        if (this.freezeFrameTimer > 0) {
            this.freezeFrameTimer -= delta * 1000;
            return; // Skip update during freeze frame
        }

        if (this.isGameOver) return;

        // Update score display
        this.scoreText.text = `Score: ${this.scoreSystem.getCurrentScore()}`;

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

        // Check for wave completion and show upgrades
        if (!this.waveSystem.isWaveActive() && this.enemies.length === 0 && !this.waitingForUpgrade) {
            const isBossWave = this.waveSystem.getCurrentWaveDefinition().isBossWave;
            
            if (isBossWave) {
                this.waitingForUpgrade = true;
                // Show upgrade selection after a short delay
                setTimeout(() => {
                    this.upgradeSystem.showUpgradeSelection(false, () => {
                        // After upgrade is selected
                        this.waitingForUpgrade = false;
                        // Start next wave
                        console.log(`Wave ${this.waveSystem.getCurrentWave()} complete! Starting next wave.`);
                        this.startWave(this.waveSystem.getCurrentWave() + 1);
                    });
                }, 500); // Small delay to let death effects finish
            } else {
                // For normal waves, just start the next wave immediately
                console.log(`Wave ${this.waveSystem.getCurrentWave()} complete! Starting next wave.`);
                this.startWave(this.waveSystem.getCurrentWave() + 1);
            }
        }

        // Get input vectors
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
            [...this.enemies, ...this.projectiles.filter(p => p.isAlive() && p instanceof Entity) as unknown as Entity[]],
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
                enemy.update(delta, this.projectiles.filter(p => p.isAlive() && p instanceof Entity) as unknown as Entity[]);
                if (!enemy.isAlive()) {
                    const wasBoss = enemy instanceof BossEnemy;
                    this.handleEnemyDeath(enemy);
                    this.removeChild(enemy);
                    this.enemies.splice(i, 1);

                    // Show upgrade screen after boss death
                    if (wasBoss) {
                        // setTimeout(() => {
                        //     this.upgradeSystem.showUpgradeSelection();
                        // }, 1000); // Show after 1 second delay
                    }
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
        // Add score for the defeated enemy
        this.scoreSystem.addScore(enemy);

        // Check if the enemy is a boss
        if (enemy instanceof BossEnemy) {
            // Kill all other enemies
            this.enemies.forEach(e => {
                if (e !== enemy && e.isAlive()) {
                    e.takeDamage(99999, { x: 0, y: 0 }, 0); // Large damage with no knockback
                }
            });
            
            // Trigger boss death effects
            this.freezeFrameTimer = GameScene.BOSS_FREEZE_DURATION;
            this.soundManager.playBossDeathSound();
            this.particleSystem.createBossDeathEffect(enemy.x, enemy.y, enemy.getColor());
            
            // Clear boss UI
            if (this.bossHealthBar) {
                this.removeChild(this.bossHealthBar);
                this.bossHealthBar = null;
            }
            if (this.bossNameText) {
                this.removeChild(this.bossNameText);
                this.bossNameText = null;
            }

            // Check if it was the Master of Arms
            if (enemy instanceof MasterOfArmsBoss) {
                // Show credits instead of upgrade screen
                setTimeout(() => {
                    this.showCredits();
                }, 2000); // Wait 2 seconds after death effects
            }
        } else {
            // Regular enemy death
            this.freezeFrameTimer = GameScene.FREEZE_FRAME_DURATION;
            this.particleSystem.createDeathEffect(enemy.x, enemy.y, enemy.getColor());
        }
    }

    private showCredits(): void {
        // Create credits container
        const credits = new PIXI.Container();
        
        // Create semi-transparent background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.9);
        bg.drawRect(0, 0, this.dimensions.width, this.dimensions.height);
        bg.endFill();
        credits.addChild(bg);

        // Create glow effect for title
        const glowSize = 60;
        const glow = new PIXI.Graphics();
        glow.beginFill(0xFFD700, 0.3);
        glow.drawCircle(this.dimensions.width / 2, 100, glowSize);
        glow.endFill();
        credits.addChild(glow);

        // Animate glow
        const animateGlow = () => {
            if (!credits.parent) return;
            glow.scale.x = 1 + Math.sin(Date.now() / 500) * 0.1;
            glow.scale.y = 1 + Math.sin(Date.now() / 500) * 0.1;
            requestAnimationFrame(animateGlow);
        };
        animateGlow();

        // Title with gradient and outline
        const title = new PIXI.Text('BLADE', {
            fontFamily: 'Arial Black, Arial Bold, Arial',
            fontSize: 64,
            fill: ['#FFD700', '#FFA500'], // Gold to orange gradient
            fillGradientType: 1,
            fillGradientStops: [0.2, 1],
            stroke: '#000000',
            strokeThickness: 6,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 4,
            dropShadowDistance: 6,
            align: 'center',
            fontWeight: 'bold'
        });
        title.anchor.set(0.5);
        title.position.set(this.dimensions.width / 2, 100);
        credits.addChild(title);

        // Add pulsing effect to title
        const animateTitle = () => {
            if (!credits.parent) return;
            title.scale.x = 1 + Math.sin(Date.now() / 1000) * 0.05;
            title.scale.y = 1 + Math.sin(Date.now() / 1000) * 0.05;
            requestAnimationFrame(animateTitle);
        };
        animateTitle();

        // Credits text
        const creditsText = [
            'Congratulations!',
            'You have defeated the Final Boss',
            'and completed the game!',
            '',
            '',
            'Game Design & Development By:',
            'Benjamin Schoolland',
            'Claud-3.5-sonnet',
            'ChatGPT',
            '',
            'Music By:',
            'Suno AI',
            '',
            '',
            'Art By:',
            'you guessed it!',
            'AI',
            '',
            'Special Thanks To:',
            'The two or three players who helped test the game',
            'Depending on whether you count me as a player',
            'And of course,',
            'Our AI overlords',
            '',
            '',
            'Thank you for playing!'
        ];

        // Create a container for scrolling text
        const textContainer = new PIXI.Container();
        credits.addChild(textContainer);

        let yPos = 0;
        creditsText.forEach((line, index) => {
            const text = new PIXI.Text(line, {
                fontFamily: 'Arial',
                fontSize: index < 3 ? 32 : 24,
                fill: index < 3 ? 0xFFD700 : 0xFFFFFF,
                align: 'center'
            });
            text.anchor.set(0.5);
            text.position.set(this.dimensions.width / 2, yPos);
            textContainer.addChild(text);
            yPos += index < 3 ? 50 : 40;
        });

        // Calculate total height of credits
        const totalCreditsHeight = yPos;

        // Add restart button
        const button = new PIXI.Graphics();
        button.beginFill(0x444444);
        button.drawRoundedRect(0, 0, 150, 50, 10);
        button.endFill();
        button.position.set(
            this.dimensions.width - 160, // Move to the top right
            50 // Position it near the top
        );
        button.interactive = true;
        button.cursor = 'pointer';
        
        const buttonText = new PIXI.Text('Play Again', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF
        });
        buttonText.anchor.set(0.5);
        buttonText.position.set(75, 25);
        button.addChild(buttonText);
        
        button.on('mouseover', () => button.tint = 0x666666);
        button.on('mouseout', () => button.tint = 0xFFFFFF);
        button.on('click', () => {
            this.removeChild(credits);
            this.restart();
        });
        
        credits.addChild(button);
        
        // Add credits to scene
        this.addChild(credits);

        // Position text container to start below screen
        textContainer.y = this.dimensions.height;

        // Start credits scroll animation
        const scrollSpeed = 0.3;
        const animate = () => {
            if (!credits.parent) return; // Stop if credits were removed
            
            // Move text container up
            textContainer.y -= scrollSpeed;
            
            // If all text has scrolled past the top (with extra padding)
            if (textContainer.y < -totalCreditsHeight - 200) {
                // Reset to below screen with extra padding
                textContainer.y = this.dimensions.height + 200;
            }
            
            requestAnimationFrame(animate);
        };
        animate();
    }
} 