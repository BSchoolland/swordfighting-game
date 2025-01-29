import * as PIXI from 'pixi.js';

export class HealthBar extends PIXI.Container {
    private background: PIXI.Graphics;
    private bar: PIXI.Graphics;
    private barWidth: number;
    private barHeight: number;
    private customColor: number | null = null;

    constructor(width: number = 100, height: number = 10, color: number | null = null) {
        super();
        this.barWidth = width;
        this.barHeight = height;
        this.customColor = color;

        // Create background (empty health)
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x333333);
        this.background.drawRect(0, 0, width, height);
        this.background.endFill();
        this.addChild(this.background);

        // Create health bar
        this.bar = new PIXI.Graphics();
        this.updateHealth(1, 1); // Initialize at full health
        this.addChild(this.bar);
    }

    public updateHealth(current: number, max: number): void {
        const ratio = Math.max(0, Math.min(1, current / max));
        
        // Update the bar graphics
        this.bar.clear();
        this.bar.beginFill(this.customColor || this.getHealthColor(ratio));
        this.bar.drawRect(0, 0, this.barWidth * ratio, this.barHeight);
        this.bar.endFill();
    }

    private getHealthColor(ratio: number): number {
        if (ratio > 0.6) return 0x00ff00; // Green
        if (ratio > 0.3) return 0xffff00; // Yellow
        return 0xff0000; // Red
    }

    public update(percentage: number): void {
        this.bar.clear();
        this.bar.beginFill(0xff0000);
        this.bar.drawRect(0, 0, this.barWidth * Math.max(0, Math.min(1, percentage)), this.barHeight);
        this.bar.endFill();
    }
} 