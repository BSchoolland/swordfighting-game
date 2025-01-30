import * as PIXI from 'pixi.js';

export class TargetCursor extends PIXI.Container {
    private cursorGraphics: PIXI.Graphics;
    private static readonly SIZE = 20;

    constructor() {
        super();

        this.cursorGraphics = new PIXI.Graphics();
        this.drawCursor();
        this.addChild(this.cursorGraphics);
    }

    private drawCursor(): void {
        this.cursorGraphics.clear();
        
        // Draw crosshair
        this.cursorGraphics.lineStyle(2, 0xff0000);
        
        // Horizontal line
        this.cursorGraphics.moveTo(-TargetCursor.SIZE/2, 0);
        this.cursorGraphics.lineTo(TargetCursor.SIZE/2, 0);
        
        // Vertical line
        this.cursorGraphics.moveTo(0, -TargetCursor.SIZE/2);
        this.cursorGraphics.lineTo(0, TargetCursor.SIZE/2);
        
        // Circle
        this.cursorGraphics.drawCircle(0, 0, TargetCursor.SIZE/3);
    }

    public updatePosition(x: number, y: number): void {
        this.position.set(x, y);
    }
} 