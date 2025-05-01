import * as PIXI from 'pixi.js';
import { GameScene } from './scenes/GameScene';
import { SoundManager } from './systems/SoundManager';
import { AdManager } from './systems/AdManager';
import { InputManager } from './systems/InputManager';

export class Game {
    private app: PIXI.Application;
    private currentScene: GameScene;
    private gameContainer: PIXI.Container;
    private inputManager: InputManager;
    private isMobile: boolean;
    private fixedDeltaTime: number = 1/60; // Target time step of 60 FPS
    private timeAccumulator: number = 0;

    // Fixed game world size
    private static readonly GAME_WIDTH = 800;
    private static readonly GAME_HEIGHT = 600;

    constructor() {
        // Check if device is mobile
        this.isMobile = this.detectMobile();
        
        // Initialize CrazyGames SDK first
        AdManager.getInstance();

        // Create application with darker background for letterboxed areas
        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x0a0a0a, // Very dark gray for letterboxed areas
            antialias: !this.isMobile, // Disable antialiasing on mobile
            resolution: 1, // Lower resolution on mobile
            autoDensity: true,
            powerPreference: this.isMobile ? 'low-power' : 'high-performance',
            view: document.createElement('canvas') as HTMLCanvasElement
        });

        const canvas = this.app.renderer.view as HTMLCanvasElement;
        if (canvas) {
            canvas.addEventListener('webglcontextlost', (e: Event) => {
                console.error('WebGL context lost', e);
                alert('WebGL context lost!');
                e.preventDefault();
            });
        }

        document.body.appendChild(this.app.view as HTMLCanvasElement);

        // Set appropriate FPS limit based on device
        this.app.ticker.maxFPS = this.isMobile ? 30 : 60; 

        // Create a container for the game world with its own background
        this.gameContainer = new PIXI.Container();
        
        // Add a background for the actual game area
        const gameBackground = new PIXI.Graphics();
        gameBackground.beginFill(0x050911); // Lighter gray for game area
        gameBackground.drawRect(0, 0, Game.GAME_WIDTH, Game.GAME_HEIGHT);
        gameBackground.endFill();
        this.gameContainer.addChild(gameBackground);
        this.app.stage.addChild(this.gameContainer);
        
        // Initialize input manager with PIXI application
        this.inputManager = new InputManager(this.app);
        
        // Initially hide mobile controls since we start with the home screen
        this.inputManager.hideMobileControls();
        
        // Create the game scene with fixed size
        this.currentScene = new GameScene({
            width: Game.GAME_WIDTH,
            height: Game.GAME_HEIGHT
        }, this.inputManager);
        this.gameContainer.addChild(this.currentScene);

        // Handle initial resize
        this.handleResize();

        // Handle fullscreen toggle with F key
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyF') {
                this.toggleFullscreen();
            }
        });

        // Add resize listener
        window.addEventListener('resize', () => this.handleResize());

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

    private detectMobile(): boolean {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 800 && window.innerHeight <= 600);
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
        // Get the actual elapsed time in seconds
        const deltaTime = this.app.ticker.deltaMS / 1000;
        
        // Update the scene with real delta time for UI and animations
        this.currentScene.update(deltaTime);
        
        // Use fixed time step for physics updates only if there's enough time accumulated
        this.timeAccumulator += deltaTime;
        if (this.timeAccumulator >= this.fixedDeltaTime) {
            // Run as many fixed updates as needed to catch up for physics
            while (this.timeAccumulator >= this.fixedDeltaTime) {
                this.currentScene.fixedUpdate?.(this.fixedDeltaTime);
                this.timeAccumulator -= this.fixedDeltaTime;
            }
        }
    }
} 