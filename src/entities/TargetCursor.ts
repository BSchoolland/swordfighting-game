import * as PIXI from 'pixi.js';

export class TargetCursor extends PIXI.Container {
    private cursor: PIXI.Graphics;
    private static readonly SIZE = 20;

    constructor() {
        super();

        this.cursor = new PIXI.Graphics();
        this.drawCursor();
        this.addChild(this.cursor);
    }

    private drawCursor(): void {
        this.cursor.clear();
        
        // Draw crosshair
        this.cursor.lineStyle(2, 0xff0000);
        
        // Horizontal line
        this.cursor.moveTo(-TargetCursor.SIZE/2, 0);
        this.cursor.lineTo(TargetCursor.SIZE/2, 0);
        
        // Vertical line
        this.cursor.moveTo(0, -TargetCursor.SIZE/2);
        this.cursor.lineTo(0, TargetCursor.SIZE/2);
        
        // Circle
        this.cursor.drawCircle(0, 0, TargetCursor.SIZE/3);
    }

    public updatePosition(x: number, y: number): void {
        this.position.set(x, y);
    }
} 