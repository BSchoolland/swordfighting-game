import * as PIXI from 'pixi.js';

export class HealthBar extends PIXI.Container {
    private background: PIXI.Graphics;
    private bar: PIXI.Graphics;
    private barWidth: number;
    private barHeight: number;

    constructor(width: number = 100, height: number = 10) {
        super();
        this.barWidth = width;
        this.barHeight = height;

        // Create background (empty health)
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x333333);
        this.background.drawRect(0, 0, width, height);
        this.background.endFill();
        this.addChild(this.background);

        // Create health bar
        this.bar = new PIXI.Graphics();
        this.bar.beginFill(0x00ff00);
        this.bar.drawRect(0, 0, width, height);
        this.bar.endFill();
        this.addChild(this.bar);
    }

    public updateHealth(current: number, max: number): void {
        const ratio = Math.max(0, Math.min(1, current / max));
        this.bar.scale.x = ratio;

        // Change color based on health percentage
        const color = this.getHealthColor(ratio);
        this.bar.tint = color;
    }

    private getHealthColor(ratio: number): number {
        if (ratio > 0.6) return 0x00ff00; // Green
        if (ratio > 0.3) return 0xffff00; // Yellow
        return 0xff0000; // Red
    }
} 