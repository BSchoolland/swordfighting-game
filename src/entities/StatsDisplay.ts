import * as PIXI from 'pixi.js';
import { Player } from './Player';

export class StatsDisplay extends PIXI.Container {
    private static readonly PANEL_WIDTH = 250;
    private static readonly PANEL_HEIGHT = 140;
    
    private panel: PIXI.Graphics;
    private player: Player;
    private statsTexts: Map<string, PIXI.Text> = new Map();
    private headerText: PIXI.Text;
    
    constructor(player: Player, xPosition: number, yPosition: number) {
        super();
        this.player = player;
        
        // Set position
        this.position.set(xPosition, yPosition);
        
        // Create panel with same style as healthbar
        this.panel = new PIXI.Graphics();
        this.panel.lineStyle(1, 0x00ffff); // width: 1px, color: cyan
        // Define beveled corners like HealthBar
        this.panel.moveTo(240, 45);
        this.panel.lineTo(220, StatsDisplay.PANEL_HEIGHT);
        this.panel.lineTo(10, StatsDisplay.PANEL_HEIGHT);
        this.panel.lineTo(0, StatsDisplay.PANEL_HEIGHT - 10);
        this.panel.lineTo(0, 10);
        this.panel.lineTo(10, 0);
        this.panel.lineTo(240, 0);
        this.panel.lineTo(250, 10);
        this.panel.lineTo(250, 35);
        this.panel.lineTo(240, 45);
        this.panel.lineTo(10, 45);
        this.addChild(this.panel);
        
        // Create header text
        this.headerText = new PIXI.Text('STATS', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: ['#42eae2'],
            stroke: '#42eae2', 
            strokeThickness: 1
        });
        this.headerText.position.set(10, 7.5);
        this.addChild(this.headerText);
        
        // Initialize stat texts
        this.createStatText('dashCooldown', 'DASH COOLDOWN', 10, 55);
        this.createStatText('swordLength', 'SWORD LENGTH', 10, 75);
        this.createStatText('swingSpeed', 'ATTACK SPEED', 10, 95);
        this.createStatText('speed', 'SPEED', 10, 115);

        
        // Initial update
        this.updateStats();
    }
    
    private createStatText(id: string, label: string, x: number, y: number): void {
        const labelText = new PIXI.Text(`${label}:`, {
            fontFamily: 'Arial',
            fontSize: 12, 
            fill: ['#ffffff'],
            stroke: '#ffffff',
            strokeThickness: 0.5
        });
        labelText.position.set(x, y);
        this.addChild(labelText);
        
        const valueText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: ['#42eae2'],
            stroke: '#42eae2',
            strokeThickness: 0.5
        });
        valueText.position.set(x + 130, y);
        this.addChild(valueText);
        
        this.statsTexts.set(id, valueText);
    }
    
    public updateStats(): void {
        // Update level
        
        // Update speed (as multiplier)
        const speedMultiplier = this.player.getSpeedMultiplier().toFixed(2) + 'x';
        this.statsTexts.get('speed')!.text = speedMultiplier;
        
        // Update sword length multiplier
        const swordLengthMultiplier = this.player.getSwordLengthMultiplier().toFixed(2) + 'x';
        this.statsTexts.get('swordLength')!.text = swordLengthMultiplier;
        
        // Update dash cooldown in seconds and current cooldown progress
        const dashCooldownMultiplier = this.player.getDashCooldownMultiplier();
        const dashCooldownSeconds = (2 * dashCooldownMultiplier).toFixed(1) + 's';
        this.statsTexts.get('dashCooldown')!.text = `${dashCooldownSeconds}`;
        
        // Update swing speed multiplier
        const swingSpeedMultiplier = this.player.getSwingSpeedMultiplier().toFixed(2) + 'x';
        this.statsTexts.get('swingSpeed')!.text = swingSpeedMultiplier;
    }
    
    public update(): void {
        this.updateStats();
    }
} 