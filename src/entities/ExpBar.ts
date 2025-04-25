import * as PIXI from 'pixi.js';

export class ExpBar extends PIXI.Container {
    private background: PIXI.Graphics;
    private bar: PIXI.Graphics;
    private levelText: PIXI.Text;
    private barWidth: number;
    private barHeight: number;
    private targetRatio: number = 0;
    private currentRatio: number = 0;
    private isAnimating: boolean = false;
    private glowOverlay: PIXI.Graphics;
    private pulseIntensity: number = 0;
    private contentContainer: PIXI.Container;

    constructor(width: number = 290, height: number = 20) {
        super();
        this.barWidth = width;
        this.barHeight = height;

        // Create container to hold everything
        this.contentContainer = new PIXI.Container();
        this.addChild(this.contentContainer);

        // Create panel with interesting shape (inverted from health bar)
        const panel = new PIXI.Graphics();
        panel.lineStyle(1, 0xffcc00); // width: 1px, color: gold
        // Define beveled corners (inverted)
        panel.moveTo(145, 45);
        panel.lineTo(110, 10);
        panel.lineTo(10, 10);
        panel.lineTo(0, 20);
        panel.lineTo(0, 80);
        panel.lineTo(10, 90);
        panel.lineTo(320, 90);
        panel.lineTo(320, 80);
        panel.lineTo(320, 65);
        panel.lineTo(310, 55);
        panel.lineTo(10, 55);
        
        this.contentContainer.addChild(panel);
        
        // create background for the bar
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000);
        // slightly rounded corners
        this.background.drawRoundedRect(10, 62.5, this.barWidth, this.barHeight, 2);
        this.background.endFill();
        this.contentContainer.addChild(this.background);

        // Create exp bar
        this.bar = new PIXI.Graphics();
        this.updateExpDisplay(0); // Initialize at zero exp
        this.contentContainer.addChild(this.bar);

        // Create level text
        this.levelText = new PIXI.Text('RANK 1', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: ['#ffcc00'],
            stroke: '#ffcc00',
            strokeThickness: 1
        });
        this.levelText.position.set(10, 17.5);
        this.contentContainer.addChild(this.levelText);
        

        
        // Create glow overlay for level-up effect
        this.glowOverlay = new PIXI.Graphics();
        this.glowOverlay.beginFill(0xffcc00, 0);
        this.glowOverlay.drawRoundedRect(10, 62.5, this.barWidth, this.barHeight, 2);
        this.glowOverlay.endFill();
        this.contentContainer.addChild(this.glowOverlay);
    }

    public updateExp(current: number, max: number, level: number): void {
        const newRatio = Math.max(0, Math.min(1, current / max));
        
        // If exp increased to full, trigger effect
        if (newRatio >= 1 && this.targetRatio < 1) {
            this.triggerLevelUpEffect();
        }
        
        // update level text
        this.levelText.text = `RANK ${level}`;
        
        this.targetRatio = newRatio;
        this.isAnimating = true;
    }

    private triggerLevelUpEffect(): void {
        // Glow effect
        this.glowOverlay.alpha = 0.8;
        
        // Pulse effect
        this.pulseIntensity = 5;
    }

    private updateExpDisplay(ratio: number): void {
        // Update the bar graphics
        this.bar.clear();
        this.bar.beginFill(this.getExpColor(ratio));
        this.bar.drawRoundedRect(10, 62.5, this.barWidth * ratio, this.barHeight, 2);
        this.bar.endFill();
    }

    private getExpColor(ratio: number): number {
        // If maxed out (ratio = 1), show a pulsing color effect
        if (ratio >= 0.99) {
            // Create a flashing effect between gold and white
            const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5; // Value between 0 and 1
            const gold = 0xffcc00;  // Gold: R:255, G:204, B:0
            const white = 0xffffff; // White: R:255, G:255, B:255
            
            // Interpolate between gold and white based on pulse
            const r = 0xff;
            const g = Math.floor(204 + (255 - 204) * pulse);
            const b = Math.floor(0 + (255 - 0) * pulse);
            
            return (r << 16) | (g << 8) | b;
        }
        
        // Normal color progression for non-maxed bar
        if (ratio < 0.3) return 0xffcc00; // Gold
        if (ratio < 0.6) return 0xffd700; // Brighter gold
        return 0xffe666; // Even brighter
    }

    public update(deltaTime: number): void {
        // Animate exp bar
        if (this.isAnimating) {
            // Smoothly animate to target exp
            const animationSpeed = 0.03;
            this.currentRatio += (this.targetRatio - this.currentRatio) * animationSpeed;
            
            // Stop animating when close enough
            if (Math.abs(this.targetRatio - this.currentRatio) < 0.001) {
                this.currentRatio = this.targetRatio;
                this.isAnimating = false;
            }
            
            this.updateExpDisplay(this.currentRatio);
        } else if (this.currentRatio >= 0.99) {
            // When maxed out, continuously update the color effect even when not animating
            this.updateExpDisplay(this.currentRatio);
        }
        
        // Update glow effect
        if (this.glowOverlay.alpha > 0) {
            this.glowOverlay.alpha -= 0.02;
        }
        
        // Update pulse effect
        if (this.pulseIntensity > 0) {
            const scale = 1 + (Math.sin(Date.now() / 100) * 0.05 * this.pulseIntensity / 5);
            this.contentContainer.scale.set(scale);
            this.pulseIntensity -= 0.1;
            
            if (this.pulseIntensity <= 0) {
                this.contentContainer.scale.set(1);
            }
        }
    }
} 