import * as PIXI from 'pixi.js';
import { SoundManager } from '../systems/SoundManager';
import { InputManager } from '../systems/InputManager';
import { GlowFilter } from '@pixi/filter-glow';


interface SelectableElement {
    container: PIXI.Container;
    onSelect?: () => void;
}

export class HomeScreen extends PIXI.Container {
    private dimensions: { width: number; height: number };
    private onStart: () => Promise<void>;
    private weaponSprites: PIXI.Graphics[] = [];
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
    
    // UI Navigation elements
    private inputManager: InputManager;
    private selectableElements: SelectableElement[] = [];
    private currentSelectedIndex: number = 0;
    private gamepadCursor: PIXI.Graphics | null = null;
    private lastInputTime: number = 0;
    private readonly INPUT_DEBOUNCE_TIME = 200; // ms

    constructor(dimensions: { width: number; height: number }, onStart: () => Promise<void>, inputManager: InputManager) {
        super();
        this.dimensions = dimensions;
        this.onStart = onStart;
        this.inputManager = inputManager;
        this.setup();
    }

    private setup(): void {
        // Create dark background with vignette effect
        // const bg = new PIXI.Graphics();
        // bg.beginFill(0x000000);
        // bg.drawRect(0, 0, this.dimensions.width, this.dimensions.height);
        // bg.endFill();


        // Create glow effect for title
        const glow = new GlowFilter({
            color: 0xffffff,
            distance: 70,
            outerStrength: 0.75,
            innerStrength: 0.5,
            quality: 0.1
        });
        

        // Create main title
        const title = new PIXI.Text('BLADE', {
            fontFamily: 'Arial Black, Arial Bold, Arial',
            fontSize: 96,
            fill: ['#ffffff', '#FFA500'],
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
        title.filters = [glow];
        // Add pulsing effect to title
        const animateTitle = () => {
            if (!this.parent) return;
            title.scale.x = 1 + Math.sin(Date.now() / 1000) * 0.05;
            title.scale.y = 1 + Math.sin(Date.now() / 1000) * 0.05;
            requestAnimationFrame(animateTitle);
        };
        animateTitle();
        this.addChild(title);

        // add "STRIKE" Diagonally at the top right of the title
        const strikeText = new PIXI.Text('STRIKE', {
            fontFamily: 'Arial Black, Arial Bold, Arial',
            fontSize: 32,
            fill: ['#FF4500', '#FF6347'],
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
        strikeText.anchor.set(0.5);
        // rotate the text 45 degrees
        strikeText.rotation = Math.PI / 4;
        strikeText.position.set(this.dimensions.width / 2 + 165, this.dimensions.height / 3 - 45);
        this.addChild(strikeText);

        // // Create subtitle
        // const subtitle = new PIXI.Text('A Top-Down Action Combat Game', {
        //     fontFamily: 'Arial',
        //     fontSize: 24,
        //     fill: 0xFFFFFF,
        //     align: 'center'
        // });
        // subtitle.anchor.set(0.5);
        // subtitle.position.set(this.dimensions.width / 2, this.dimensions.height / 3 + 80);
        // this.addChild(subtitle);

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
            buttonBg.tint = 0xFFFFFF;
            buttonText.scale.set(1.1);
            this.setSelectedElement(0); // Update selection for gamepad
        });
        button.on('mouseout', () => {
            if (this.currentSelectedIndex !== 0) { // Only reset if not gamepad selected
                buttonBg.tint = 0x666666;
                buttonText.scale.set(1);
            }
        });
        button.on('click', async () => {
            SoundManager.getInstance().playPowerUpSound();
            await this.onStart();
        });

        this.addChild(button);
        
        // Add to selectable elements
        this.selectableElements.push({
            container: button,
            onSelect: async () => {
                SoundManager.getInstance().playPowerUpSound();
                await this.onStart();
            }
        });

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
            'KEYBOARD:\nWASD - Move\nMouse - Aim\nLeft Click - Attack\nSpace - Dash',
            {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 0x47eee9,
                align: 'right'
            }
        );
        controlsText.anchor.set(0.5);
        controlsText.position.set(100, this.dimensions.height - 100);
        this.addChild(controlsText);
        // box around the controls text
        const controlsBox = new PIXI.Graphics();
        controlsBox.lineStyle(1, 0x47eee9);
        controlsBox.drawRoundedRect(0, 0, controlsText.width + 20, controlsText.height + 10, 4);
        controlsBox.position.set(controlsText.x - 90, controlsText.y - 60);
        this.addChild(controlsBox);

        // controller controls
        const controllerText = new PIXI.Text(
            'GAMEPAD:\nLeft Stick - Move\nRight Stick - Aim\nRT - Attack\nLT - Dash',
            {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 0x47eee9,
                align: 'left'
            }
        );
        controllerText.anchor.set(0.5);
        controllerText.position.set(this.dimensions.width - 100, this.dimensions.height - 100);
        this.addChild(controllerText);
        // box around the controller text
        const controllerBox = new PIXI.Graphics();
        controllerBox.lineStyle(1, 0x47eee9);
        controllerBox.drawRoundedRect(0, 0, controllerText.width + 20, controllerText.height + 10, 4);
        controllerBox.position.set(controllerText.x - 87.5, controllerText.y - 60);
        this.addChild(controllerBox);

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
            settingsIcon.tint = 0xFFFFFF;
            this.setSelectedElement(1); // Update selection for gamepad
        });
        settingsButton.on('mouseout', () => {
            if (this.currentSelectedIndex !== 1) { // Only reset if not gamepad selected
                settingsIcon.tint = 0x666666;
            }
        });
        settingsButton.on('click', () => {
            this.toggleSettingsPanel();
        });

        this.addChild(settingsButton);
        
        // Add to selectable elements
        this.selectableElements.push({
            container: settingsButton,
            onSelect: () => {
                this.toggleSettingsPanel();
            }
        });
        
        // Create gamepad selection cursor (initially invisible)
        this.gamepadCursor = new PIXI.Graphics();
        this.gamepadCursor.lineStyle(2, 0xFFFFFF, 0.8);
        this.gamepadCursor.drawRoundedRect(-5, -5, 210, 70, 10);
        this.gamepadCursor.visible = false;
        this.addChild(this.gamepadCursor);
        
        // Set initial selection
        this.setSelectedElement(0);

        // Start animation loop
        this.animate();

        // Start tip rotation
        this.rotateTips();
    }

    private toggleSettingsPanel(): void {
        if (this.settingsPanel) {
            this.removeChild(this.settingsPanel);
            this.settingsPanel = null;
            
            // Remove the settings toggle buttons from selectable elements
            this.selectableElements = this.selectableElements.slice(0, 2);
            
            // Reset selection to settings button
            this.setSelectedElement(1);
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
        musicToggle.on('mouseover', () => {
            this.setSelectedElement(2); // Music toggle is the 3rd selectable element (index 2)
        });
        musicToggle.on('click', () => {
            const newState = !soundManager.isMusicEnabled();
            soundManager.setMusicEnabled(newState);
            this.updateToggleButton(musicToggle, newState);
        });
        this.settingsPanel.addChild(musicToggle);
        
        // Add to selectable elements
        this.selectableElements.push({
            container: musicToggle,
            onSelect: () => {
                const newState = !soundManager.isMusicEnabled();
                soundManager.setMusicEnabled(newState);
                this.updateToggleButton(musicToggle, newState);
            }
        });

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
        sfxToggle.on('mouseover', () => {
            this.setSelectedElement(3); // SFX toggle is the 4th selectable element (index 3)
        });
        sfxToggle.on('click', () => {
            const newState = !soundManager.isSoundEffectsEnabled();
            soundManager.setSoundEffectsEnabled(newState);
            this.updateToggleButton(sfxToggle, newState);
        });
        this.settingsPanel.addChild(sfxToggle);
        
        // Add to selectable elements
        this.selectableElements.push({
            container: sfxToggle,
            onSelect: () => {
                const newState = !soundManager.isSoundEffectsEnabled();
                soundManager.setSoundEffectsEnabled(newState);
                this.updateToggleButton(sfxToggle, newState);
            }
        });

        // Aim assist toggle
        const aimAssistLabel = new PIXI.Text('Aim Assist', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xFFFFFF,
            align: 'left'
        });
        aimAssistLabel.position.set(30, 170);
        this.settingsPanel.addChild(aimAssistLabel);

        const aimAssistToggle = this.createToggleButton(this.inputManager.isAimAssistEnabled());
        aimAssistToggle.position.set(200, 170);
        aimAssistToggle.on('mouseover', () => {
            this.setSelectedElement(4); // Aim assist toggle is the 5th selectable element (index 4)
        });
        aimAssistToggle.on('click', () => {
            const newState = !this.inputManager.isAimAssistEnabled();
            this.inputManager.setAimAssistEnabled(newState);
            this.updateToggleButton(aimAssistToggle, newState);
        });
        this.settingsPanel.addChild(aimAssistToggle);
        
        // Add to selectable elements
        this.selectableElements.push({
            container: aimAssistToggle,
            onSelect: () => {
                const newState = !this.inputManager.isAimAssistEnabled();
                this.inputManager.setAimAssistEnabled(newState);
                this.updateToggleButton(aimAssistToggle, newState);
            }
        });

        // Position the panel
        this.settingsPanel.position.set(
            this.dimensions.width - 340,
            80
        );

        this.addChild(this.settingsPanel);
        
        // Ensure gamepad cursor is always on top by removing and re-adding it
        if (this.gamepadCursor) {
            this.removeChild(this.gamepadCursor);
            this.addChild(this.gamepadCursor);
        }
        
        // Move to the first element in the settings panel
        this.setSelectedElement(2);
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
        
        // Handle gamepad UI navigation
        this.handleGamepadInput();

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
    
    private handleGamepadInput(): void {
        const now = Date.now();
        if (now - this.lastInputTime < this.INPUT_DEBOUNCE_TIME) return;
        
        // Check for gamepad input
        if (!this.inputManager.isUsingGamepad()) return;
        
        // Handle directional navigation
        if (this.inputManager.isMenuUpTriggered()) {
            this.navigateMenu('up');
            this.lastInputTime = now;
        } else if (this.inputManager.isMenuDownTriggered()) {
            this.navigateMenu('down');
            this.lastInputTime = now;
        } else if (this.inputManager.isMenuLeftTriggered()) {
            this.navigateMenu('left');
            this.lastInputTime = now;
        } else if (this.inputManager.isMenuRightTriggered()) {
            this.navigateMenu('right');
            this.lastInputTime = now;
        }
        
        // Handle selection with A button
        if (this.inputManager.isPrimaryActionJustPressed()) {
            this.selectCurrentElement();
        }
        
        // Handle back/cancel with B button
        if (this.inputManager.isSecondaryActionJustPressed() && this.settingsPanel) {
            this.toggleSettingsPanel();
        }
    }
    
    private navigateMenu(direction: 'up' | 'down' | 'left' | 'right'): void {
        const settingsOpen = this.settingsPanel !== null;
        let newIndex = this.currentSelectedIndex;
        
        // Adjust navigation based on current UI state
        if (settingsOpen) {
            // When settings panel is open
            switch (direction) {
                case 'up':
                    if (newIndex === 4) newIndex = 3;
                    else if (newIndex === 3) newIndex = 2;
                    else if (newIndex === 2) newIndex = 1;
                    break;
                case 'down':
                    if (newIndex === 1) newIndex = 2;
                    else if (newIndex === 2) newIndex = 3;
                    else if (newIndex === 3) newIndex = 4;
                    break;
                case 'left':
                    if (newIndex === 1) newIndex = 0;
                    break;
                case 'right':
                    if (newIndex === 0) newIndex = 1;
                    break;
            }
        } else {
            // Main menu navigation
            switch (direction) {
                case 'up':
                    if (newIndex === 0) newIndex = 1;
                    else newIndex = 0;
                    break;
                case 'down':
                    if (newIndex === 1) newIndex = 0;
                    else newIndex = 1;
                    break;
                case 'left':
                    newIndex = 0;
                    break;
                case 'right':
                    newIndex = 1;
                    break;
            }
        }
        
        if (newIndex !== this.currentSelectedIndex) {
            this.setSelectedElement(newIndex);
            SoundManager.getInstance().playMenuSound();
        }
    }
    
    private setSelectedElement(index: number): void {
        if (index >= this.selectableElements.length) return;
        
        // Reset highlight on previously selected element
        if (this.currentSelectedIndex !== index && this.currentSelectedIndex < this.selectableElements.length) {
            const prevElement = this.selectableElements[this.currentSelectedIndex].container;
            if (prevElement.getChildAt(0) instanceof PIXI.Graphics) {
                (prevElement.getChildAt(0) as PIXI.Graphics).tint = 0x666666;
            }
            
            // Reset scale on previous element if it's the start button
            if (this.currentSelectedIndex === 0 && prevElement.getChildAt(1) instanceof PIXI.Text) {
                (prevElement.getChildAt(1) as PIXI.Text).scale.set(1);
            }
        }
        
        // Update current index
        this.currentSelectedIndex = index;
        
        // Highlight the new selection
        const element = this.selectableElements[index].container;
        if (element.getChildAt(0) instanceof PIXI.Graphics) {
            (element.getChildAt(0) as PIXI.Graphics).tint = 0xFFFFFF;
        }
        
        // Scale up text if it's the start button
        if (index === 0 && element.getChildAt(1) instanceof PIXI.Text) {
            (element.getChildAt(1) as PIXI.Text).scale.set(1.1);
        }
        
        // Position the gamepad cursor
        if (this.gamepadCursor && this.inputManager.isUsingGamepad()) {
            this.gamepadCursor.visible = true;
            
            // Get the global position of the element
            const globalPos = element.getGlobalPosition();
            // Convert global position back to local position relative to this container
            const localPos = this.toLocal(globalPos);
            
            // Special adjustment for settings button
            const isSettingsButton = index === 1;
            const offsetX = isSettingsButton ? -17.5 : 0;
            const offsetY = isSettingsButton ? -17.5 : 0;
            
            // Set cursor position using local coordinates with potential offset
            this.gamepadCursor.position.set(
                localPos.x + offsetX,
                localPos.y + offsetY
            );
            
            // Adjust cursor size based on element size
            const elementWidth = element.width;
            const elementHeight = element.height;
            this.gamepadCursor.clear();
            this.gamepadCursor.lineStyle(2, 0xFFFFFF, 0.8);
            this.gamepadCursor.drawRoundedRect(-5, -5, elementWidth + 10, elementHeight + 10, 10);

            // Ensure gamepad cursor is always on top
            this.removeChild(this.gamepadCursor);
            this.addChild(this.gamepadCursor);
        }
    }
    
    private selectCurrentElement(): void {
        if (this.currentSelectedIndex < this.selectableElements.length) {
            const element = this.selectableElements[this.currentSelectedIndex];
            if (element.onSelect) {
                element.onSelect();
            }
        }
    }
    
    public update(): void {
        // Method to be called from game loop to update UI state
        this.handleGamepadInput();
    }
} 