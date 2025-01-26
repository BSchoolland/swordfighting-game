import * as PIXI from 'pixi.js';
import { GameScene } from './scenes/GameScene';

export class Game {
    private app: PIXI.Application;
    private currentScene: GameScene;
    private gameContainer: PIXI.Container;

    // Fixed game world size
    private static readonly GAME_WIDTH = 800;
    private static readonly GAME_HEIGHT = 600;

    constructor() {
        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x1a1a1a,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            view: document.createElement('canvas') as HTMLCanvasElement,
            resizeTo: window
        });

        document.body.appendChild(this.app.view as HTMLCanvasElement);

        // Create a container for the game world
        this.gameContainer = new PIXI.Container();
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

        // Calculate scale to fit the screen while maintaining aspect ratio
        const scaleX = screenWidth / Game.GAME_WIDTH;
        const scaleY = screenHeight / Game.GAME_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        // Center the game container
        this.gameContainer.scale.set(scale);
        this.gameContainer.x = (screenWidth - Game.GAME_WIDTH * scale) / 2;
        this.gameContainer.y = (screenHeight - Game.GAME_HEIGHT * scale) / 2;
    }

    private update(): void {
        this.currentScene.update();
    }
} 