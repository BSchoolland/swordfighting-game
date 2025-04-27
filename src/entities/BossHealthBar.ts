import * as PIXI from 'pixi.js';

export class BossHealthBar extends PIXI.Container {
    private background: PIXI.Graphics;
    private bar: PIXI.Graphics;
    private barWidth: number;
    private barHeight: number;
    private targetRatio: number = 1;
    private currentRatio: number = 1;
    private isAnimating: boolean = false;
    private flashOverlay: PIXI.Graphics;
    private shakeIntensity: number = 0;
    private shakeContainer: PIXI.Container;
    private bossNameText: PIXI.Text;
    private bossName: string;

    constructor(width: number = 300, height: number = 20, bossName: string = "Boss") {
        super();
        this.barWidth = width;
        this.barHeight = height;
        this.bossName = bossName;

        // Create shake container to hold everything
        this.shakeContainer = new PIXI.Container();
        this.addChild(this.shakeContainer);

        // Create panel with interesting shape
        const panel = new PIXI.Graphics();
        panel.lineStyle(2, 0xff0000); // width: 2px, color: red
        
        // Define beveled corners for a menacing look - more compact
        panel.moveTo(20, 0);
        panel.lineTo(width - 20, 0);
        panel.lineTo(width, 15);
        panel.lineTo(width, 25);
        panel.lineTo(width - 15, 25);
        panel.lineTo(width - 10, 40);
        panel.lineTo(width, 40);
        panel.lineTo(width - 20, 55);
        panel.lineTo(20, 55);
        panel.lineTo(0, 40);
        panel.lineTo(10, 40);
        panel.lineTo(5, 25);
        panel.lineTo(0, 25);
        panel.lineTo(0, 15);
        panel.lineTo(20, 0);


        
        this.shakeContainer.addChild(panel);
        
        // Create name text
        this.bossNameText = new PIXI.Text(this.bossName, {
            fontFamily: 'Arial Black, Arial Bold, Arial',
            fontSize: 18,
            fill: 0xff0000,
            align: 'center',
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 4,
            dropShadowDistance: 3,
        });
        this.bossNameText.anchor.set(0.5, 0.5);
        this.bossNameText.position.set(width / 2, 15);
        this.shakeContainer.addChild(this.bossNameText);
        
        // Create background for the bar
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000);
        this.background.drawRoundedRect(25, 30, this.barWidth - 50, this.barHeight, 3);
        this.background.endFill();
        this.shakeContainer.addChild(this.background);
        
        // Create health bar
        this.bar = new PIXI.Graphics();
        this.updateHealthDisplay(1); // Initialize at full health
        this.shakeContainer.addChild(this.bar);
        
        // Create flash overlay for damage effect
        this.flashOverlay = new PIXI.Graphics();
        this.flashOverlay.beginFill(0xff0000, 0);
        this.flashOverlay.drawRoundedRect(25, 30, this.barWidth - 50, this.barHeight, 3);
        this.flashOverlay.endFill();
        this.shakeContainer.addChild(this.flashOverlay);
        
        // Center the entire bar
        this.pivot.x = width / 2;
    }

    public containsPoint(x: number, y: number): boolean {
        const global = new PIXI.Point(300, 0);  // Get HealthBar's global position
        const width = this.barWidth + 10; // Width of your panel's overall shape
        const height = 80; // Height of your panel's overall shape
        return (
            x >= global.x &&
            x <= global.x + width * this.scale.x &&
            y >= global.y &&
            y <= global.y + height * this.scale.y
        ) 
        
    }

    public setName(name: string): void {
        this.bossName = name;
        this.bossNameText.text = name;
    }

    public getName(): string {
        return this.bossName;
    }

    public getNameText(): PIXI.Text {
        return this.bossNameText;
    }

    public updateHealth(current: number, max: number): void {
        const newRatio = Math.max(0, Math.min(1, current / max));
        
        // If health decreased
        if (newRatio < this.targetRatio) {
            this.triggerDamageEffects();
        }
        
        this.targetRatio = newRatio;
        this.isAnimating = true;
    }

    private triggerDamageEffects(): void {
        // Flash effect
        this.flashOverlay.alpha = 0.7;
        
        // Shake effect
        this.shakeIntensity = 5;
    }

    private updateHealthDisplay(ratio: number): void {
        // Update the bar graphics
        this.bar.clear();
        
        // Health color changes based on the actual health percentage (targetRatio)
        // This ensures color immediately represents real health state
        const color = this.getHealthColor(this.targetRatio);
        
        this.bar.beginFill(color);
        this.bar.drawRoundedRect(25, 30, (this.barWidth - 50) * ratio, this.barHeight, 3);
        this.bar.endFill();
    }

    private getHealthColor(ratio: number): number {
        if (ratio > 0.6) return 0xff3300; // Bright red for high health
        if (ratio > 0.3) return 0xff6600; // Orange for medium health
        return 0xffcc00; // Yellow for low health - makes it feel more urgent/dangerous
    }

    public update(_deltaTime: number): void {
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