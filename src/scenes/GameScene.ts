import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { InputManager } from '../systems/InputManager';
import { HealthBar } from '../entities/HealthBar';
import { BossHealthBar } from '../entities/BossHealthBar';
import { GameOverScreen } from './GameOverScreen';
import { Projectile } from '../entities/projectiles/Projectile';
import { SoundManager } from '../systems/SoundManager';
import { WaveSystem } from '../systems/WaveSystem';
import { Entity } from '../entities/Entity';
import { BossEnemy } from '../entities/enemies/BossEnemy';
import { ParticleSystem } from '../effects/ParticleSystem';
import { ExpBar } from '../entities/ExpBar';
import { StatsDisplay } from '../entities/StatsDisplay';

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
    private statsDisplay!: StatsDisplay;
    private gameOverScreen: GameOverScreen | null = null;
    private isGameOver: boolean = false;
    private soundManager: SoundManager;
    private waveSystem: WaveSystem;
    private bossHealthBar: BossHealthBar | null = null;
    private freezeFrameTimer: number = 0;
    private static readonly FREEZE_FRAME_DURATION = 75; // 75ms freeze for regular enemy deaths
    private static readonly BOSS_FREEZE_DURATION = 400; // 400ms freeze for boss deaths
    private playerDeathTimer: number = 0; // Track time since player death
    private previousUpgradeScreenVisible: boolean = false; // Track previous upgrade screen state

    // Wave display
    private waveText!: PIXI.Text;
    private waveAnnouncement!: PIXI.Text;
    private upgradeAvailableText!: PIXI.Text;
    private static readonly WAVE_ANNOUNCEMENT_DURATION = 3000; // 3 seconds to show new wave message
    private waveAnnouncementTimer: number = 0;

    private particleSystem: ParticleSystem;
    private upgradeSystem: UpgradeSystem;

    private homeScreen: HomeScreen | null = null;
    private gameStarted: boolean = false;
    private waitingForUpgrade: boolean = false;

    private scoreSystem: ScoreSystem;
    private adManager: AdManager;

    private expBar!: ExpBar;

    constructor(dimensions: { width: number; height: number }, inputManager: InputManager) {
        super();
        this.dimensions = dimensions;
        this.inputManager = inputManager;
        this.soundManager = SoundManager.getInstance();
        this.adManager = AdManager.getInstance();
        
        // Check SDK status
        const sdkStatus = this.adManager.getInitializationStatus();
        if (sdkStatus.fallbackMode) {
            console.warn('SDK Status:', sdkStatus.error);
            // Create warning text with appropriate message
            const warningMessage = sdkStatus.error?.includes('disabled on this domain') 
                ? 'Development Mode - No Ads'
                : 'Offline Mode';
            const warningText = new PIXI.Text(warningMessage, {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 0xffaa00,
                align: 'right'
            });
            warningText.position.set(dimensions.width - warningText.width - 10, dimensions.height - 30);
            warningText.alpha = 0.7;
            this.addChild(warningText);
        }
        
        // Initialize score system
        this.scoreSystem = new ScoreSystem();
        
        // Initialize sound system
        this.soundManager.initialize().catch(console.error);

        // Show home screen initially
        this.showHomeScreen();

        // Initialize particle system
        this.particleSystem = ParticleSystem.getInstance(this);

        // Initialize player first
        this.player = new Player(dimensions, this.inputManager);
        this.addChild(this.player);

        // make player invisible by moving far offscreen
        this.player.position.set(-1000, -1000);
        
        // Initialize upgrade system before wave system
        this.upgradeSystem = new UpgradeSystem(dimensions, this.player, this.inputManager);
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
        if (this.expBar) {
            this.removeChild(this.expBar);
            this.expBar = null!;
        }
        if (this.statsDisplay) {
            this.removeChild(this.statsDisplay);
        }
        
        // Reset game state
        this.isGameOver = false;
        this.gameStarted = false;
        this.waitingForUpgrade = false;
        
        // Hide mobile controls when showing home screen
        this.inputManager.hideMobileControls();
        
        // Reinitialize core systems
        console.log('[GameScene] Reinitializing systems for menu');
        this.player = new Player(this.dimensions, this.inputManager);
        this.addChild(this.player);
        // Move player off screen initially
        this.player.position.set(-1000, -1000);
        
        // Clear any existing enemies to avoid memory leaks
        this.enemies = [];
        
        // Remove any existing home screen
        if (this.homeScreen) {
            this.removeChild(this.homeScreen);
        }
        
        // Create and add home screen
        this.homeScreen = new HomeScreen(this.dimensions, this.startGame.bind(this), this.inputManager);
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
        this.playerDeathTimer = 0; // Reset player death timer

        // Reset score system
        this.scoreSystem.reset();

        // Clear all existing entities and UI elements
        this.enemies.forEach(enemy => this.removeChild(enemy));
        this.enemies = [];
        this.projectiles.forEach(projectile => this.removeChild(projectile));
        this.projectiles = [];

        // Reset player position and state
        this.player.reset();
        // this.player.increaseSpeed(1);
        // this.player.increaseSwordLength(2);
        this.player.position.set(this.dimensions.width / 2, this.dimensions.height / 2);

        // Reset wave system, but only set hardcore mode if coming from home screen
        const wasHardcore = this.waveSystem.getHardcoreMode();
        this.waveSystem = new WaveSystem(this.dimensions, this.player, this.enemies, this.upgradeSystem);
        if (this.homeScreen) {
            // Only set hardcore mode from home screen if we're not restarting
            this.waveSystem.setHardcoreMode(this.homeScreen.isHardcoreModeEnabled());
        } else {
            // If no home screen, we're restarting, so keep previous hardcore mode
            this.waveSystem.setHardcoreMode(wasHardcore);
        }

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
        if (this.waveAnnouncement) {
            this.removeChild(this.waveAnnouncement);
        }
        if (this.bossHealthBar) {
            this.removeChild(this.bossHealthBar);
            this.bossHealthBar = null;
        }

        // Reset music to normal background music
        this.soundManager.transitionToNormalMusic();
        
        // Create exp bar
        if (!this.expBar) {
            console.log('[GameScene] Creating exp bar');
            this.createExpBar();
        }
        
        // Create UI elements
        
        // Create target cursor
        console.log('[GameScene] Creating target cursor');
        this.targetCursor = new PIXI.Graphics();
        this.drawCursor();
        this.addChild(this.targetCursor);

        // Create health bar
        console.log('[GameScene] Creating health bar');
        this.healthBar = new HealthBar();
        this.healthBar.position.set(20, 20);
        this.addChild(this.healthBar);
        
        // Create stats display
        console.log('[GameScene] Creating stats display');
        this.statsDisplay = new StatsDisplay(this.player, this.dimensions.width - 265, 10);
        this.addChild(this.statsDisplay);

        // Create wave text (top right corner)
        console.log('[GameScene] Creating wave text');
        this.waveText = new PIXI.Text('WAVE 1', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0x4af6f0,
            stroke: 0x4af6f0,
            strokeThickness: 1,
            align: 'center'
        });
        this.waveText.position.set(this.dimensions.width - 150, 17.5);
        this.addChild(this.waveText);

        // Create upgrade available text
        this.upgradeAvailableText = new PIXI.Text('⭐ Upgrade Available!', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xffd700,
            align: 'center'
        });
        this.upgradeAvailableText.position.set(20, 50); // Below health bar
        this.upgradeAvailableText.visible = false;
        this.addChild(this.upgradeAvailableText);

        // Create score text under wave text
        console.log('[GameScene] Creating score text');

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

        // Show mobile controls when starting the game
        this.inputManager.showMobileControls();

        // Start first wave
        console.log('[GameScene] Starting first wave');
        this.startWave(1);
    }

    private startWave(waveNumber: number): void {
        // Don't start wave if waiting for upgrade selection
        if (this.waitingForUpgrade) {
            return;
        }
        this.waveSystem.setWave(8);
        // Update score system with new wave
        this.scoreSystem.setWave(waveNumber);
        this.waveSystem.startNextWave();

        // Update wave text
        this.waveText.text = `WAVE ${waveNumber}`;
        
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
        
        // Reset player death timer
        this.playerDeathTimer = 0;

        // Store hardcore mode state before clearing game elements
        const wasHardcore = this.waveSystem.getHardcoreMode();
        console.log('[GameScene] Storing hardcore mode state:', wasHardcore);

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
        if (this.waveAnnouncement) {
            console.log('[GameScene] Removing wave announcement');
            this.removeChild(this.waveAnnouncement);
        }
        if (this.upgradeSystem) {
            console.log('[GameScene] Removing upgrade system');
            this.removeChild(this.upgradeSystem);
        }
        if (this.expBar) {
            console.log('[GameScene] Removing exp bar');
            this.removeChild(this.expBar);
            this.expBar = null!;
        }
        if (this.statsDisplay) {
            this.removeChild(this.statsDisplay);
        }

        // Reset game state
        console.log('[GameScene] Resetting game state');
        this.isGameOver = false;
        
        // Show mobile controls when restarting the game
        this.inputManager.showMobileControls();
        
        // Reinitialize player
        console.log('[GameScene] Reinitializing player');
        this.player = new Player(this.dimensions, this.inputManager);
        this.addChild(this.player);
        this.player.position.set(this.dimensions.width / 2, this.dimensions.height / 2);
        
        // Reinitialize upgrade system
        console.log('[GameScene] Reinitializing upgrade system');
        this.upgradeSystem = new UpgradeSystem(this.dimensions, this.player, this.inputManager);
        this.addChild(this.upgradeSystem);
        
        // Reinitialize wave system and restore hardcore mode setting
        console.log('[GameScene] Reinitializing wave system');
        this.waveSystem = new WaveSystem(this.dimensions, this.player, this.enemies, this.upgradeSystem);
        this.waveSystem.setHardcoreMode(wasHardcore);
        console.log('[GameScene] Restored hardcore mode state:', wasHardcore);
        
        // Start game immediately instead of showing home screen
        console.log('[GameScene] Starting new game');
        await this.startGame();
    }

    private async showGameOver(): Promise<void> {
        if (this.isGameOver) return;
        // Wait for ad to be shown before continuing
        const adResult = this.adManager.showAd();
        console.log('[GameScene] Ad result:', adResult);

        // Reset any pending upgrade state
        this.waitingForUpgrade = false;
        this.upgradeSystem.forceHideUpgradeSelection();
        
        this.isGameOver = true;
        this.gameStarted = false;

        // Notify gameplay stop
        await this.adManager.notifyGameplayStop();

        // Hide mobile controls when showing game over screen
        this.inputManager.hideMobileControls();

        // Create and show game over screen
        this.gameOverScreen = new GameOverScreen(
            this.dimensions.width,
            this.dimensions.height,
            async () => {
                
                await this.restart();
            },
            async () => this.showHomeScreen(),
            this.scoreSystem,
            this.inputManager,
            this.waveSystem
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
        // Find boss in enemies array
        const boss = this.enemies.find(enemy => enemy instanceof BossEnemy) as BossEnemy | undefined;
        if (boss) {
            // If we already have a boss health bar, no need to recreate it
            if (this.bossHealthBar) {
                const targetAlpha = this.bossHealthBar.containsPoint(this.player.x, this.player.y) ? 0.2 : 1;
                this.bossHealthBar.alpha += (targetAlpha - this.bossHealthBar.alpha) * 0.1;
                return;
            };
            
            // Add boss UI elements
            this.bossHealthBar = boss.getHealthBar();
            
            // Ensure health bar is centered
            if (this.bossHealthBar) {
                // Position at top center of screen
                this.bossHealthBar.position.x = (this.dimensions.width) / 2;
                this.bossHealthBar.position.y = 20; // Small padding from top
                
                // Add immediately without fade-in effect
                this.bossHealthBar.alpha = 1;
                
                this.addChild(this.bossHealthBar);
            }
        } else if (this.bossHealthBar) {
            // No boss found, but we have a health bar - remove it
            this.removeBossHealthBar();
        }
    }

    private removeBossHealthBar(): void {
        if (this.bossHealthBar) {
            // Create a simple fade out effect
            const duration = 800; // 0.8 second fade
            let elapsed = 0;
            
            // Make sure the boss bar doesn't update while fading away
            this.bossHealthBar.visible = true;
            
            // Animation function
            const animate = () => {
                if (!this.bossHealthBar) return;
                
                elapsed += 16.67; // Approximate for 60fps
                const progress = Math.min(elapsed / duration, 1);
                
                // Simply fade out without scaling
                this.bossHealthBar.alpha = 1 - progress;
                
                if (progress >= 1) {
                    // Remove after animation completes
                    if (this.bossHealthBar.parent) {
                        this.removeChild(this.bossHealthBar);
                    }
                    this.bossHealthBar = null;
                } else {
                    requestAnimationFrame(animate);
                }
            };
            
            // Start animation
            requestAnimationFrame(animate);
        }
    }

    private handleEnemyDeath(enemy: BaseEnemy): void {
        // Add score for the defeated enemy
        this.scoreSystem.addScore(enemy);

        // Check if the enemy is a boss
        if (enemy instanceof BossEnemy) {
            // Reset any pending upgrade state before boss death sequence
            this.waitingForUpgrade = false;
            this.upgradeSystem.forceHideUpgradeSelection();
            
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
            
            // Remove boss UI with effect
            this.removeBossHealthBar();

            // Check if it was the Master of Arms
            if (enemy instanceof MasterOfArmsBoss) {
                // Prevent new upgrades and spawns for 2 seconds
                this.waitingForUpgrade = true; // This prevents new waves and upgrades
                
                // Show credits after the delay
                setTimeout(() => {
                    // Set the game completion flag in localStorage
                    localStorage.setItem('gameCompleted', 'true');
                    this.showCredits();
                    this.isGameOver = true;
                    this.gameStarted = false;
                }, 2000); // Wait 2 seconds before ending
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
        
        // Get hardcore mode state
        const isHardcore = this.waveSystem.getHardcoreMode();
        
        // Create semi-transparent background with different color for hardcore
        const bg = new PIXI.Graphics();
        bg.beginFill(isHardcore ? 0x110000 : 0x000000, 0.9);
        bg.drawRect(0, 0, this.dimensions.width, this.dimensions.height);
        bg.endFill();
        credits.addChild(bg);

        // Create glow effect for title with different color for hardcore
        const glowSize = 60;
        const glow = new PIXI.Graphics();
        glow.beginFill(isHardcore ? 0xFF0000 : 0xFFD700, 0.3);
        glow.drawCircle(this.dimensions.width / 2, 100, glowSize);
        glow.endFill();
        credits.addChild(glow);

        // Animate glow with more intense animation for hardcore
        const animateGlow = () => {
            if (!credits.parent) return;
            const intensity = isHardcore ? 0.2 : 0.1;
            glow.scale.x = 1 + Math.sin(Date.now() / 500) * intensity;
            glow.scale.y = 1 + Math.sin(Date.now() / 500) * intensity;
            requestAnimationFrame(animateGlow);
        };
        animateGlow();

        // Title with different style for hardcore
        const title = new PIXI.Text('BLADE STRIKE', {
            fontFamily: 'Arial Black, Arial Bold, Arial',
            fontSize: 64,
            fill: isHardcore ? ['#FF0000', '#8B0000'] : ['#FFD700', '#FFA500'], // Red gradient for hardcore, gold for normal
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

        // Add pulsing effect to title with more intense animation for hardcore
        const animateTitle = () => {
            if (!credits.parent) return;
            const intensity = isHardcore ? 0.08 : 0.05;
            title.scale.x = 1 + Math.sin(Date.now() / 1000) * intensity;
            title.scale.y = 1 + Math.sin(Date.now() / 1000) * intensity;
            requestAnimationFrame(animateTitle);
        };
        animateTitle();

        // Different credits text for hardcore mode
        const creditsText = isHardcore ? [
            'INCREDIBLE ACHIEVEMENT!',
            'You have conquered Blade Strike',
            'in HARDCORE MODE!',
            '',
            'This puts you among the elite few',
            'who have mastered the game',
            'without the safety net of healing.',
            '',
            'Game Design & Development By:',
            'Benjamin Schoolland',
            '',
            'Music By:',
            'Suno AI',
            '',
            'Your Achievement:',
            'Blade Strike Hardcore Champion',
            '',
            'Special Recognition:',
            'Your exceptional skill and perseverance',
            'have earned you a place among',
            'the greatest warriors.',
            '',
            'Thank you for pushing the limits',
            'of what we thought possible!',
            '',
            'A true master of the blade!'
        ] : [
            'Congratulations!',
            'You have defeated the Final Boss',
            'and completed the game!',
            '',
            '',
            'Game Design & Development By:',
            'Benjamin Schoolland',
            '',
            'Music By:',
            'Suno AI',
            '',
            '',
            'Art By:',
            'Well there wasn\'t really any art... hmm...',
            '',
            'Special Thanks To:',
            'The two or three players who helped test the game',
            'Depending on whether you count me as a player',
            'And of course,',
            'You!',
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
                fill: isHardcore ? 
                    (index < 3 ? 0xFF0000 : 0xFFFFFF) : // Red for hardcore titles
                    (index < 3 ? 0xFFD700 : 0xFFFFFF),  // Gold for normal titles
                align: 'center',
                stroke: isHardcore && index < 3 ? '#600000' : undefined,
                strokeThickness: isHardcore && index < 3 ? 2 : 0
            });
            text.anchor.set(0.5);
            text.position.set(this.dimensions.width / 2, yPos);
            textContainer.addChild(text);
            yPos += index < 3 ? 50 : 40;
        });

        // Calculate total height of credits
        const totalCreditsHeight = yPos;

        // Add restart button with different style for hardcore
        const button = new PIXI.Graphics();
        button.beginFill(isHardcore ? 0x660000 : 0x444444);
        button.drawRoundedRect(0, 0, 150, 50, 10);
        button.endFill();
        button.position.set(
            this.dimensions.width - 160,
            50
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
        
        button.on('mouseover', () => button.tint = isHardcore ? 0x880000 : 0x666666);
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

        // Start credits scroll animation (slightly faster for hardcore)
        const scrollSpeed = isHardcore ? 0.35 : 0.3;
        const animate = () => {
            if (!credits.parent) return;
            
            textContainer.y -= scrollSpeed;
            
            if (textContainer.y < -totalCreditsHeight - 200) {
                textContainer.y = this.dimensions.height + 200;
            }
            
            requestAnimationFrame(animate);
        };
        animate();
    }

    public update(delta: number): void {
        // Update Home Screen or Game Over Screen if they exist
        if (this.homeScreen) {
            this.homeScreen.update();
        }

        if (this.gameOverScreen) {
            this.gameOverScreen.update();
        }
        
        if (!this.gameStarted || this.isGameOver) return;

        // Update upgrade system
        this.upgradeSystem.update();
        
        // Handle StatsDisplay visibility
        const upgradeScreenVisible = this.upgradeSystem.isUpgradeScreenVisible();

        // Safety check - if we're waiting for upgrade but screen isn't visible after 1 second
        if (this.waitingForUpgrade && !upgradeScreenVisible && this.player.hasAvailableUpgrade()) {
            // Force show upgrade selection
            this.upgradeSystem.forceShowUpgradeSelection(this.waveSystem.getCurrentWaveDefinition().isBossWave, () => {
                this.player.clearUpgradeAvailable();
                this.waitingForUpgrade = false;
                console.log(`Wave ${this.waveSystem.getCurrentWave()} complete! Starting next wave.`);
                this.startWave(this.waveSystem.getCurrentWave() + 1);
            });
        }

        // Always update target cursor visibility based on upgrade screen state
        if (this.targetCursor) {
            this.targetCursor.visible = !upgradeScreenVisible;
        }

        // Show stats when upgrade screen is visible
        if (upgradeScreenVisible) {
            this.statsDisplay.show();
            this.inputManager.hideMobileControls();
        } else if (this.previousUpgradeScreenVisible && !upgradeScreenVisible) {
            this.inputManager.showMobileControls();

            // Only hide when visibility changes from true to false
            this.statsDisplay.hide(true); // true = use the 3-second delay
        }
        this.previousUpgradeScreenVisible = upgradeScreenVisible;
        
        // StatsDisplay update happens later in the method, so we don't update here
        
        // Update EXP bar with new method
        this.updateExpBar();
        // Always update the ExpBar with the current delta time for smooth animations
        if (this.expBar) {
            this.expBar.update(delta);
        }

        // Update upgrade available indicator
        if (this.upgradeAvailableText) {
            this.upgradeAvailableText.visible = false; //this.player.hasAvailableUpgrade();
        }

        // Continue updating the game even when upgrade screen is visible
        // This allows enemies to continue moving and animations to play
        // The waitingForUpgrade flag prevents starting a new wave

        // Handle freeze frames
        if (this.freezeFrameTimer > 0) {
            this.freezeFrameTimer -= delta * 1000;
            return; // Skip update during freeze frame
        }

        // Handle wave announcement fade out
        if (this.waveAnnouncement && this.waveAnnouncement.alpha > 0) {
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
            this.waitingForUpgrade = true;
            
            // Show upgrade selection if available, regardless of wave type
            if (this.player.hasAvailableUpgrade()) {
                // Show upgrade selection after a short delay
                setTimeout(() => {
                    this.upgradeSystem.showUpgradeSelection(this.waveSystem.getCurrentWaveDefinition().isBossWave, () => {
                        // After upgrade is selected
                        this.player.clearUpgradeAvailable();
                        this.waitingForUpgrade = false;
                        // Start next wave
                        console.log(`Wave ${this.waveSystem.getCurrentWave()} complete! Starting next wave.`);
                        this.startWave(this.waveSystem.getCurrentWave() + 1);
                    });
                }, 500); // Small delay to let death effects finish
            } else {
                // No upgrade available, start next wave immediately
                this.waitingForUpgrade = false;
                console.log(`Wave ${this.waveSystem.getCurrentWave()} complete! Starting next wave.`);
                this.startWave(this.waveSystem.getCurrentWave() + 1);
            }
        }

        // Get input vectors
        
        // Update target cursor position based on input type
        if (this.inputManager.isUsingGamepad()) {
            const aim = this.inputManager.getAimDirection();
            // For gamepad, position relative to player
            const aimDistance = 100;
            this.targetCursor.position.set(
                this.player.x + aim.x * aimDistance,
                this.player.y + aim.y * aimDistance
            );
        } else {
            // For mouse, use exact mouse position in world space
            let mousePos = this.inputManager.getMousePosition(this.player, this.enemies);
            if (mousePos.convert){
                this.targetCursor.position.set(this.screenToWorldSpace(mousePos.x, mousePos.y).x, this.screenToWorldSpace(mousePos.x, mousePos.y).y);
            } else {
                this.targetCursor.position.set(mousePos.x, mousePos.y)
            }
        }

        // We no longer need to update physics here since it's done in fixedUpdate
        // But we need to keep updating player animation, health display, etc.
        
        // check if the player is near in space to the health bar
        if (this.healthBar) {
            const targetAlpha = this.healthBar.containsPoint(this.player.x, this.player.y) ? 0.2 : 1;
            this.healthBar.alpha += (targetAlpha - this.healthBar.alpha) * 0.1;
        }
        
        // check if player is near in space to the exp bar
        if (this.expBar) {
            const targetExpAlpha = this.expBar.containsPoint(this.player.x, this.player.y) ? 0.2 : 1;
            this.expBar.alpha += (targetExpAlpha - this.expBar.alpha) * 0.1;
        }

        // Update health bar
        if (this.healthBar) {
            this.healthBar.updateHealth(this.player.getHealth(), this.player.getMaxHealth());
            this.healthBar.update(delta);
        }
        
        // Update stats display
        if (this.statsDisplay) {
            this.statsDisplay.update(delta * 1000);
        }

        // Update boss UI
        this.updateBossUI();

        // Check for game over
        if (!this.player.isAlive() && !this.isGameOver) {
            if (this.playerDeathTimer === 0) {
                // Player just died, start the timer
                this.playerDeathTimer = 2000;
                
                // Create player death explosion effect
                this.soundManager.playBossDeathSound(); // Use the same sound as boss death
                this.particleSystem.createPlayerDeathEffect(this.player.x, this.player.y); // Use our new player-specific effect
                
                // Hide the player
                this.player.alpha = 0;
            } else {
                // Count down the timer
                this.playerDeathTimer -= delta * 1000;
                if (this.playerDeathTimer <= 0) {
                    // Timer complete, show game over
                    this.showGameOver();
                    return;
                }
            }
        }

        // Update particle effects
        this.particleSystem.update(delta);
    }

    /**
     * Fixed timestep update for physics calculations
     * @param fixedDelta fixed delta time in seconds (typically 1/60)
     */
    public fixedUpdate(fixedDelta: number): void {
        if (!this.gameStarted || this.isGameOver || this.freezeFrameTimer > 0) return;
        
        // Skip physics when upgrade screen is visible
        const upgradeScreenVisible = this.upgradeSystem.isUpgradeScreenVisible();
        if (upgradeScreenVisible) return;

        // Only update player physics if player is alive
        if (this.player.isAlive()) {
            this.player.update(
                fixedDelta,
                this.inputManager.getKeys(),
                this.targetCursor.x,
                this.targetCursor.y,
                this.inputManager.isDashActive(),
                [...this.enemies, ...this.projectiles.filter(p => p.isAlive() && p instanceof Entity) as unknown as Entity[]],
                this.inputManager.isAttacking()
            );
        }

        // Update enemies physics
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy instanceof BaseEnemy) {
                enemy.playerIsAttacking = this.inputManager.isAttacking();
                enemy.update(fixedDelta, this.projectiles.filter(p => p.isAlive() && p instanceof Entity) as unknown as Entity[]);
                if (!enemy.isAlive()) {
                    const wasBoss = enemy instanceof BossEnemy;
                    this.handleEnemyDeath(enemy);
                    this.removeChild(enemy);
                    this.enemies.splice(i, 1);
                    // Add freeze frame effect based on enemy type
                    this.freezeFrameTimer = wasBoss ? GameScene.BOSS_FREEZE_DURATION : GameScene.FREEZE_FRAME_DURATION;
                }
            }
        }

        // Update projectiles physics
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            if (projectile.isAlive()) {
                projectile.update(fixedDelta, [this.player, ...this.enemies]);
            } else {
                this.removeChild(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }

    private createExpBar(): void {
        // Create the ExpBar instance
        this.expBar = new ExpBar();
        this.expBar.position.set(10, this.dimensions.height - 110);
        this.addChild(this.expBar);
        this.updateExpBar(); // Initialize with current player values
    }

    private updateExpBar(): void {
        if (!this.expBar) return;
        
        // Update the ExpBar with player's current experience, max experience needed, and level
        this.expBar.updateExp(
            this.player.getExperience(),
            this.player.getExpNeededForNextLevel(),
            this.player.getLevel()
        );
    }
} 