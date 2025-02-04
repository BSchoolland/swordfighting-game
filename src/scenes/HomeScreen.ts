import * as PIXI from 'pixi.js';
import { SoundManager } from '../systems/SoundManager';

export class HomeScreen extends PIXI.Container {
    private dimensions: { width: number; height: number };
    private onStart: () => Promise<void>;
    private weaponSprites: PIXI.Graphics[] = [];
    private readonly weaponColors = [0xFFD700, 0xFF4400, 0x00AA44, 0x666666];
    private readonly weaponRotationSpeeds = [0.02, -0.03, 0.025, -0.015];
    private settingsPanel: PIXI.Container | null = null;
    private tipsText!: PIXI.Text;
    private currentTipIndex: number = 0;
    private readonly tips: string[] = [
        'Hint: Attacking while dashing deals double damage!',
        'Hint: You can slice projectiles out of the air!',
        'Hint: Defeating a boss grants powerful upgrades!',
        'Hint: Bosses spawn minions while alive, defeat them quickly!'
    ];

    constructor(dimensions: { width: number; height: number }, onStart: () => Promise<void>) {
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
            fontFamily: 'Arial Black, Arial Bold, Arial',
            fontSize: 24,
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
        buttonText.anchor.set(0.5);
        buttonText.position.set(100, 34);
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
        button.on('click', async () => {
            SoundManager.getInstance().playPowerUpSound();
            await this.onStart();
        });

        this.addChild(button);

        // Add combat tips text
        this.tipsText = new PIXI.Text(
            this.tips[0],
            {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: 0xFFD700,
                align: 'center'
            }
        );
        this.tipsText.anchor.set(0.5);
        this.tipsText.position.set(this.dimensions.width / 2, this.dimensions.height * 0.7 + 80);
        this.addChild(this.tipsText);

        

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

        // Add settings button
        const settingsButton = new PIXI.Container();
        const settingsIcon = new PIXI.Graphics();
        settingsIcon.lineStyle(3, 0xFFD700);
        settingsIcon.beginFill(0x000000, 0.5);
        settingsIcon.drawCircle(0, 0, 15);
        settingsIcon.endFill();
        
        // Add gear teeth
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            settingsIcon.lineStyle(3, 0xFFD700);
            settingsIcon.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
            settingsIcon.lineTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
        }

        settingsButton.addChild(settingsIcon);
        settingsButton.position.set(this.dimensions.width - 40, 40);
        settingsButton.interactive = true;
        settingsButton.cursor = 'pointer';

        settingsButton.on('mouseover', () => {
            settingsIcon.tint = 0x666666;
        });
        settingsButton.on('mouseout', () => {
            settingsIcon.tint = 0xFFFFFF;
        });
        settingsButton.on('click', () => {
            this.toggleSettingsPanel();
        });

        this.addChild(settingsButton);

        // Start animation loop
        this.animate();

        // Start tip rotation
        this.rotateTips();
    }

    private toggleSettingsPanel(): void {
        if (this.settingsPanel) {
            this.removeChild(this.settingsPanel);
            this.settingsPanel = null;
            return;
        }

        const soundManager = SoundManager.getInstance();
        
        // Create settings panel
        this.settingsPanel = new PIXI.Container();
        
        // Panel background
        const panelBg = new PIXI.Graphics();
        panelBg.lineStyle(3, 0xFFD700);
        panelBg.beginFill(0x000000, 0.9);
        panelBg.drawRoundedRect(0, 0, 300, 200, 15);
        panelBg.endFill();
        this.settingsPanel.addChild(panelBg);

        // Settings title
        const title = new PIXI.Text('Settings', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            fill: 0xFFD700,
            align: 'center'
        });
        title.anchor.set(0.5, 0);
        title.position.set(150, 20);
        this.settingsPanel.addChild(title);

        // Music toggle
        const musicLabel = new PIXI.Text('Music', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xFFFFFF,
            align: 'left'
        });
        musicLabel.position.set(30, 70);
        this.settingsPanel.addChild(musicLabel);

        const musicToggle = this.createToggleButton(soundManager.isMusicEnabled());
        musicToggle.position.set(200, 70);
        musicToggle.on('click', () => {
            const newState = !soundManager.isMusicEnabled();
            soundManager.setMusicEnabled(newState);
            this.updateToggleButton(musicToggle, newState);
        });
        this.settingsPanel.addChild(musicToggle);

        // Sound effects toggle
        const sfxLabel = new PIXI.Text('Sound Effects', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xFFFFFF,
            align: 'left'
        });
        sfxLabel.position.set(30, 120);
        this.settingsPanel.addChild(sfxLabel);

        const sfxToggle = this.createToggleButton(soundManager.isSoundEffectsEnabled());
        sfxToggle.position.set(200, 120);
        sfxToggle.on('click', () => {
            const newState = !soundManager.isSoundEffectsEnabled();
            soundManager.setSoundEffectsEnabled(newState);
            this.updateToggleButton(sfxToggle, newState);
        });
        this.settingsPanel.addChild(sfxToggle);

        // Position the panel
        this.settingsPanel.position.set(
            this.dimensions.width - 340,
            80
        );

        this.addChild(this.settingsPanel);
    }

    private createToggleButton(initialState: boolean): PIXI.Container {
        const container = new PIXI.Container();
        container.interactive = true;
        container.cursor = 'pointer';

        const bg = new PIXI.Graphics();
        bg.lineStyle(2, 0xFFD700);
        bg.beginFill(0x000000);
        bg.drawRoundedRect(0, 0, 60, 30, 15);
        bg.endFill();
        container.addChild(bg);

        const circle = new PIXI.Graphics();
        circle.beginFill(0xFFD700);
        circle.drawCircle(0, 0, 12);
        circle.endFill();
        circle.position.set(initialState ? 45 : 15, 15);
        container.addChild(circle);

        return container;
    }

    private updateToggleButton(button: PIXI.Container, state: boolean): void {
        const circle = button.getChildAt(1);
        circle.position.x = state ? 45 : 15;
    }

    private animate(): void {
        if (!this.parent) return;

        // Rotate weapon sprites
        this.weaponSprites.forEach((weapon, i) => {
            weapon.rotation += this.weaponRotationSpeeds[i];
        });

        requestAnimationFrame(() => this.animate());
    }

    private rotateTips(): void {
        // Fade out current tip
        const fadeOut = () => {
            if (this.tipsText.alpha <= 0) {
                // Change text and start fade in
                this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
                this.tipsText.text = this.tips[this.currentTipIndex];
                fadeIn();
            } else {
                this.tipsText.alpha -= 0.05;
                requestAnimationFrame(fadeOut);
            }
        };

        // Fade in new tip
        const fadeIn = () => {
            if (this.tipsText.alpha >= 1) {
                // Wait 5 seconds before starting next fade out
                setTimeout(() => fadeOut(), 7500);
            } else {
                this.tipsText.alpha += 0.05;
                requestAnimationFrame(fadeIn);
            }
        };

        // Start the cycle
        setTimeout(() => fadeOut(), 7500);
    }
} 