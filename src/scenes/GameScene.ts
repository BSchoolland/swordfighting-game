import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { TargetCursor } from '../entities/TargetCursor';
import { InputManager } from '../systems/InputManager';

export class GameScene extends PIXI.Container {
    private player: Player;
    private targetCursor: TargetCursor;
    private inputManager: InputManager;
    private worldToScreenScale: number = 1;

    constructor(dimensions: { width: number; height: number }) {
        super();

        this.inputManager = new InputManager();

        // Create player with fixed game world bounds
        this.player = new Player(dimensions);
        this.player.x = dimensions.width / 2;
        this.player.y = dimensions.height / 2;
        this.addChild(this.player);

        // Create target cursor
        this.targetCursor = new TargetCursor();
        this.addChild(this.targetCursor);
    }

    public setWorldToScreenScale(scale: number): void {
        this.worldToScreenScale = scale;
    }

    private screenToWorldSpace(screenX: number, screenY: number): { x: number, y: number } {
        // Get the game container's global position
        const globalPos = this.getGlobalPosition();
        
        // Convert screen coordinates to world space
        return {
            x: (screenX - globalPos.x) / this.worldToScreenScale,
            y: (screenY - globalPos.y) / this.worldToScreenScale
        };
    }

    public update(): void {
        // Convert mouse position to world space
        const mousePos = this.inputManager.getMousePosition();
        const worldPos = this.screenToWorldSpace(mousePos.x, mousePos.y);
        
        // Update target cursor position
        this.targetCursor.updatePosition(worldPos.x, worldPos.y);
        
        // Update player with mouse position and dash state
        this.player.update(
            this.inputManager.getKeys(),
            worldPos.x,
            worldPos.y,
            this.inputManager.isDashActive()
        );
    }
} 