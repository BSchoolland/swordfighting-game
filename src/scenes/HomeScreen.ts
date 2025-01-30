import * as PIXI from 'pixi.js';
import { SoundManager } from '../systems/SoundManager';

export class HomeScreen extends PIXI.Container {
    private dimensions: { width: number; height: number };
    private onStart: () => void;
    private weaponSprites: PIXI.Graphics[] = [];
    private readonly weaponColors = [0xFFD700, 0xFF4400, 0x00AA44, 0x666666];
    private readonly weaponRotationSpeeds = [0.02, -0.03, 0.025, -0.015];

    constructor(dimensions: { width: number; height: number }, onStart: () => void) {
        super();
        this.dimensions = dimensions;
        this.onStart = onStart;
        this.setup();
    }

    private setup(): void {
        // Create dark background with vignette effect
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000);
        bg.drawRect(0, 0, this.dimensions.width, this.dimensions.height);
        bg.endFill();

        // Add vignette effect
        const vignette = new PIXI.Graphics();
        const gradientSteps = 10;
        for (let i = 0; i < gradientSteps; i++) {
            const alpha = (i / gradientSteps) * 0.5;
            vignette.beginFill(0x000000, alpha);
            vignette.drawCircle(
                this.dimensions.width / 2,
                this.dimensions.height / 2,
                Math.max(this.dimensions.width, this.dimensions.height) * (1 - i / gradientSteps)
            );
            vignette.endFill();
        }
        this.addChild(bg, vignette);

        // Create rotating weapon sprites in background
        for (let i = 0; i < 4; i++) {
            const weapon = new PIXI.Graphics();
            weapon.lineStyle(4, this.weaponColors[i]);
            weapon.moveTo(-30, 0);
            weapon.lineTo(30, 0);
            weapon.position.set(
                this.dimensions.width / 2 + Math.cos(i * Math.PI / 2) * 150,
                this.dimensions.height / 2 + Math.sin(i * Math.PI / 2) * 150
            );
            weapon.alpha = 0.3;
            this.weaponSprites.push(weapon);
            this.addChild(weapon);
        }

        // Create glow effect for title
        const glowSize = 80;
        const glow = new PIXI.Graphics();
        glow.beginFill(0xFFD700, 0.3);
        glow.drawCircle(this.dimensions.width / 2, this.dimensions.height / 3, glowSize);
        glow.endFill();
        this.addChild(glow);

        // Animate glow
        const animateGlow = () => {
            if (!this.parent) return;
            glow.scale.x = 1 + Math.sin(Date.now() / 500) * 0.2;
            glow.scale.y = 1 + Math.sin(Date.now() / 500) * 0.2;
            requestAnimationFrame(animateGlow);
        };
        animateGlow();

        // Create main title
        const title = new PIXI.Text('BLADE', {
            fontFamily: 'Arial Black, Arial Bold, Arial',
            fontSize: 96,
            fill: ['#FFD700', '#FFA500'],
            fillGradientType: 1,
            fillGradientStops: [0.2, 1],
            stroke: '#000000',
            strokeThickness: 8,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 6,
            dropShadowAngle: Math.PI / 4,
            dropShadowDistance: 8,
            align: 'center',
            fontWeight: 'bold'
        });
        title.anchor.set(0.5);
        title.position.set(this.dimensions.width / 2, this.dimensions.height / 3);

        // Add pulsing effect to title
        const animateTitle = () => {
            if (!this.parent) return;
            title.scale.x = 1 + Math.sin(Date.now() / 1000) * 0.05;
            title.scale.y = 1 + Math.sin(Date.now() / 1000) * 0.05;
            requestAnimationFrame(animateTitle);
        };
        animateTitle();
        this.addChild(title);

        // Create subtitle
        const subtitle = new PIXI.Text('A Top-Down Action Combat Game', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center'
        });
        subtitle.anchor.set(0.5);
        subtitle.position.set(this.dimensions.width / 2, this.dimensions.height / 3 + 80);
        this.addChild(subtitle);

        // Create start button
        const button = new PIXI.Container();
        const buttonBg = new PIXI.Graphics();
        buttonBg.lineStyle(3, 0xFFD700);
        buttonBg.beginFill(0x000000, 0.5);
        buttonBg.drawRoundedRect(0, 0, 200, 60, 15);
        buttonBg.endFill();
        button.addChild(buttonBg);

        const buttonText = new PIXI.Text('START GAME', {
            fontFamily: 'Arial Black',
            fontSize: 28,
            fill: 0xFFD700,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        buttonText.position.set(100, 30);
        button.addChild(buttonText);

        button.position.set(
            (this.dimensions.width - 200) / 2,
            this.dimensions.height * 0.7
        );
        button.interactive = true;
        button.cursor = 'pointer';

        // Button hover effects
        button.on('mouseover', () => {
            buttonBg.tint = 0x666666;
            buttonText.scale.set(1.1);
        });
        button.on('mouseout', () => {
            buttonBg.tint = 0xFFFFFF;
            buttonText.scale.set(1);
        });
        button.on('click', () => {
            SoundManager.getInstance().playPowerUpSound();
            this.onStart();
        });

        this.addChild(button);

        // Add controls text
        const controlsText = new PIXI.Text(
            'Keyboard Controls:\nWASD - Move\nMouse - Aim\nLeft Click - Attack\nSpace - Dash',
            {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 0xCCCCCC,
                align: 'center'
            }
        );
        controlsText.anchor.set(0.5);
        controlsText.position.set(100, this.dimensions.height - 100);
        this.addChild(controlsText);

        // controller controls
        const controllerText = new PIXI.Text(
            'Gamepad Controls:\nLeft Stick - Move\nRight Stick - Aim\nRT - Attack\nLT - Dash',
            {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 0xCCCCCC,
                align: 'center'
            }
        );
        controllerText.anchor.set(0.5);
        controllerText.position.set(this.dimensions.width - 100, this.dimensions.height - 100);
        this.addChild(controllerText);

        // Start animation loop
        this.animate();
    }

    private animate(): void {
        if (!this.parent) return;

        // Rotate weapon sprites
        this.weaponSprites.forEach((weapon, i) => {
            weapon.rotation += this.weaponRotationSpeeds[i];
        });

        requestAnimationFrame(() => this.animate());
    }
} 