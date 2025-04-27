import * as PIXI from 'pixi.js';

export class HealthBar extends PIXI.Container {
    private background: PIXI.Graphics;
    private bar: PIXI.Graphics;
    private healthText: PIXI.Text;
    private currentHealthText: PIXI.Text;
    private maxHealthText: PIXI.Text;
    private barWidth: number;
    private barHeight: number;
    private customColor: number | null = null;
    private targetRatio: number = 1;
    private currentRatio: number = 1;
    private isAnimating: boolean = false;
    private flashOverlay: PIXI.Graphics;
    private shakeIntensity: number = 0;
    private shakeContainer: PIXI.Container;

    constructor(width: number = 130, height: number = 20, color: number | null = null) {
        super();
        this.barWidth = width;
        this.barHeight = height;
        this.customColor = color;

        // Create shake container to hold everything
        this.shakeContainer = new PIXI.Container();
        this.addChild(this.shakeContainer);

        // Create panel with interesting shape
        const panel = new PIXI.Graphics();
        panel.lineStyle(1, 0x00ffff); // width: 2px, color: cyan
        // panel.beginFill(0x1e1e1e); // dark grey
        // Define beveled corners
        panel.moveTo(155, 50);
        panel.lineTo(110, 90);
        panel.lineTo(10, 90);
        panel.lineTo(0, 80);
        panel.lineTo(0, 10);
        panel.lineTo(10, 0);
        panel.lineTo(240, 0);
        panel.lineTo(250, 10);
        panel.lineTo(250, 35);
        panel.lineTo(240, 45);
        panel.lineTo(10, 45);
        
        this.shakeContainer.addChild(panel);
        
        // create background for the bar
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000);
        // slightly rounded corners
        this.background.drawRoundedRect(90, 12.5, this.barWidth, this.barHeight, 2);
        this.background.endFill();
        this.shakeContainer.addChild(this.background);

        // Create health bar
        this.bar = new PIXI.Graphics();
        this.updateHealthDisplay(1); // Initialize at full health
        this.shakeContainer.addChild(this.bar);

        // create HEALTH text
        this.healthText = new PIXI.Text('HEALTH', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: ['#42eae2'],
            stroke: '#42eae2',
            strokeThickness: 1
        });
        this.healthText.position.set(10, 7.5);
        this.shakeContainer.addChild(this.healthText);

        // create current health text
        this.currentHealthText = new PIXI.Text('100', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: ['#ffffff'],
            stroke: '#ffffff',
            strokeThickness: 1
        });
        this.currentHealthText.position.set(10, 52.5);
        this.shakeContainer.addChild(this.currentHealthText);
        // create max health text
        this.maxHealthText = new PIXI.Text('/100', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: ['#ffffff'],
            stroke: '#ffffff',
            strokeThickness: 1
        });
        // set x to the end of the current health text
        this.maxHealthText.position.set(this.currentHealthText.x + this.currentHealthText.width, 56.5);
        this.shakeContainer.addChild(this.maxHealthText);
        // Create flash overlay for damage effect
        this.flashOverlay = new PIXI.Graphics();
        this.flashOverlay.beginFill(0xff0000, 0);
        this.flashOverlay.drawRoundedRect(90, 12.5, this.barWidth, this.barHeight, 2);
        this.flashOverlay.endFill();
        this.shakeContainer.addChild(this.flashOverlay);
        this.scale.set(0.8);

    }

    public containsPoint(x: number, y: number): boolean {
        const global = new PIXI.Point(0, 0);  // Get HealthBar's global position
        const width = 280; // Width of your panel's overall shape
        const height = 120; // Height of your panel's overall shape
        const exclusionPoint= new PIXI.Point(150, 60); // anything that's right and below this point is excluded
        // console.log(Math.round(x), Math.round(y));
        if (
            x >= global.x &&
            x <= global.x + width * this.scale.x &&
            y >= global.y &&
            y <= global.y + height * this.scale.y
        ) {
            if (
                x >= exclusionPoint.x &&
                y >= exclusionPoint.y
            ) {
                return false;
            }
            return true;
        }
        return false;
    }

    public updateHealth(current: number, max: number): void {
        const newRatio = Math.max(0, Math.min(1, current / max));
        
        // If health decreased
        if (newRatio < this.targetRatio) {
            this.triggerDamageEffects();
        }
        // update current health text
        this.currentHealthText.text = current.toString();
        // update max health text
        this.maxHealthText.text = '/' + max.toString();
        // set x to the end of the current health text (in case the length of the current health text changes)
        this.maxHealthText.position.set(this.currentHealthText.x + this.currentHealthText.width, 56.5);

        this.targetRatio = newRatio;
        this.isAnimating = true;
    }

    private triggerDamageEffects(): void {
        // Flash effect
        this.flashOverlay.alpha = 0.5;
        
        // Shake effect
        this.shakeIntensity = 5;
    }

    private updateHealthDisplay(ratio: number): void {
        // Update the bar graphics
        this.bar.clear();
        this.bar.beginFill(this.customColor || this.getHealthColor(this.targetRatio));
        this.bar.drawRoundedRect(110, 12.5, this.barWidth * ratio, this.barHeight, 2);
        this.bar.endFill();
    }

    private getHealthColor(ratio: number): number {
        if (ratio > 0.6) return 0x26f3a2; // Green
        if (ratio > 0.3) return 0xffff00; // Yellow
        return 0xff0000; // Red
    }

    public update(deltaTime: number): void {
        // Animate health bar
        if (this.isAnimating) {
            // Smoothly animate to target health
            const animationSpeed = 0.05;
            this.currentRatio += (this.targetRatio - this.currentRatio) * animationSpeed;
            
            // Stop animating when close enough
            if (Math.abs(this.targetRatio - this.currentRatio) < 0.001) {
                this.currentRatio = this.targetRatio;
                this.isAnimating = false;
            }
            
            this.updateHealthDisplay(this.currentRatio);
        }
        
        // Update flash effect
        if (this.flashOverlay.alpha > 0) {
            this.flashOverlay.alpha -= 0.05;
        }
        
        // Update shake effect
        if (this.shakeIntensity > 0) {
            // Apply shake to the container, not to the main position
            this.shakeContainer.position.x = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.shakeContainer.position.y = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.shakeIntensity -= 0.5;
            
            if (this.shakeIntensity <= 0) {
                this.shakeContainer.position.x = 0;
                this.shakeContainer.position.y = 0;
            }
        }
    }
} 