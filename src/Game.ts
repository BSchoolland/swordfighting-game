import * as PIXI from 'pixi.js';
import { GameScene } from './scenes/GameScene';
import { SoundManager } from './systems/SoundManager';
import { AdManager } from './systems/AdManager';

export class Game {
    private app: PIXI.Application;
    private currentScene: GameScene;
    private gameContainer: PIXI.Container;

    // Fixed game world size
    private static readonly GAME_WIDTH = 800;
    private static readonly GAME_HEIGHT = 600;

    constructor() {
        // Initialize CrazyGames SDK first
        AdManager.getInstance();

        // Create application with darker background for letterboxed areas
        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x0a0a0a, // Very dark gray for letterboxed areas
            antialias: true,
            resolution: 1, // Fixed resolution of 1 to avoid scaling issues
            view: document.createElement('canvas') as HTMLCanvasElement
            // Removed resizeTo property to manually handle resizing
        });

        document.body.appendChild(this.app.view as HTMLCanvasElement);

        this.app.ticker.maxFPS = 60; // Limit to 60 FPS

        // Create a container for the game world with its own background
        this.gameContainer = new PIXI.Container();
        
        // Add a background for the actual game area
        const gameBackground = new PIXI.Graphics();
        gameBackground.beginFill(0x1a1a1a); // Lighter gray for game area
        gameBackground.drawRect(0, 0, Game.GAME_WIDTH, Game.GAME_HEIGHT);
        gameBackground.endFill();
        this.gameContainer.addChild(gameBackground);
        
        this.app.stage.addChild(this.gameContainer);
        
        // Create the game scene with fixed size
        this.currentScene = new GameScene({
            width: Game.GAME_WIDTH,
            height: Game.GAME_HEIGHT
        });
        this.gameContainer.addChild(this.currentScene);

        // Initial resize
        this.handleResize();

        // Handle fullscreen toggle with F key
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyF') {
                this.toggleFullscreen();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        this.app.ticker.add(() => {
            this.update();
        });

        // Start background music on first user interaction
        const startMusic = async () => {
            await SoundManager.getInstance().initialize();
            SoundManager.getInstance().startBackgroundMusic();
            window.removeEventListener('click', startMusic);
            window.removeEventListener('keydown', startMusic);
        };
        window.addEventListener('click', startMusic);
        window.addEventListener('keydown', startMusic);
    }

    private async toggleFullscreen(): Promise<void> {
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err) {
                console.error('Error attempting to enable fullscreen:', err);
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    }

    private handleResize(): void {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Explicitly set canvas dimensions to match window size
        this.app.renderer.resize(screenWidth, screenHeight);

        // Calculate scale to fit the screen while maintaining aspect ratio
        const scaleX = screenWidth / Game.GAME_WIDTH;
        const scaleY = screenHeight / Game.GAME_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        // Center the game container
        this.gameContainer.scale.set(scale);
        this.gameContainer.x = (screenWidth - Game.GAME_WIDTH * scale) / 2;
        this.gameContainer.y = (screenHeight - Game.GAME_HEIGHT * scale) / 2;

        // Update scene with new scale
        this.currentScene.setWorldToScreenScale(scale);
    }

    private update(): void {
        this.currentScene.update(this.app.ticker.deltaMS / 1000);
    }
} 