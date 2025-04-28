import * as PIXI from 'pixi.js';
// @ts-ignore - HighScore type is used in ScoreSystem
import { HighScore, ScoreSystem } from '../systems/ScoreSystem';
import { InputManager } from '../systems/InputManager';
import { SoundManager } from '../systems/SoundManager';
import { WaveSystem } from '../systems/WaveSystem';

interface SelectableElement {
    container: PIXI.Container;
    onSelect?: () => void;
}

export class GameOverScreen extends PIXI.Container {
    private static readonly STYLE = new PIXI.TextStyle({
        fontFamily: 'Arial Black, Arial Bold, Arial',
        fontSize: 72,
        fill: ['#ff0000', '#880000'], // Red gradient
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
    
    private static readonly GENERAL_TIPS = [
        "Have you tried not dying?",
        "The secret is to keep your health above 0",
        "Maybe try hitting them before they hit you?",
        "Enemies are dangerous, who knew?"
    ];

    private static readonly WAVE_BASED_TIPS: { [key: string]: string[] } = {
        // Waves 1-3: Basic introduction
        early: [
            "Don't worry, you'll get the hang of it",
            'A dash-strike is a dash and an attack at the same time.  Try it next time',
            "Too weak? Upgrades can help! But you have to beat wave 3 first",
            "The yellow ones are faster than you.",
            "Pro tip: Moving helps avoid attacks",
        ],
        // Waves 4-7: Getting harder
        mid: [
            "Arrows hurt less if you dodge them",
            "Getting surrounded isn't a winning strategy",
            "Try keeping your distance... from everything",
            "Try hitting the fast ones before they hit you",
            "Those big guys don't go down easy, do they?"
        ],
        // Waves 8-11: Advanced challenges
        late: [
            "Watch your back... and front... and sides",
            "Ninjas are sneaky, who would've thought?",
            "Duck, dodge, and... oh wait, you're dead",
            "Maybe try a different approach... or game",
            "Getting surrounded isn't a winning strategy",
            "Your strategy of running into enemies was... interesting",

        ],
        // Waves 12+: Expert level
        expert: [
            "I'm actually impressed you survived until now",
            "You were doing so well... what happened?",
            "When there are a lot of enemies, it's okay to run",
            "The developer is probably evil",
        ]
    };

    private static readonly BOSS_TIPS: { [key: string]: string[] } = {
        warrior: [
            "The Warrior boss is actually supposed to hit you less",
            "Pro tip: Hammers hurt. A lot.",
            "Big hammer, big pain",
            "Maybe try hitting the boss with your sword?"
        ],
        berserker: [
            "Berserkers have no chill, unlike you now",
            "Maybe don't stand near the angry one?",
            "Rage quit? The Berserker beat you to it",
            "Their sword is bigger than yours, just saying",
            "Maybe try hitting the boss with your sword?"
        ],
        hunter: [
            "Turns out being hunted isn't fun",
            "Looks like the Hunter was better at dodging than you were",
            "Arrows hurt less if you dodge them",
            "Some enemies can dodge your attacks. Like really really easily."
        ],
        master: [
            "So close!",
            "Maybe start with the tutorial next time?",
            "Life isn't fair.  This game isn't life but you get the point.",
            "This game is a lot harder than it looks, and it looks pretty hard",
            "The developer is probably evil",
        ]
    };
    
    // UI Navigation elements
    private inputManager: InputManager;
    private selectableElements: SelectableElement[] = [];
    private currentSelectedIndex: number = 0;
    private gamepadCursor: PIXI.Graphics | null = null;
    private lastInputTime: number = 0;
    private readonly INPUT_DEBOUNCE_TIME = 200; // ms

    constructor(width: number, height: number, onRestart: () => Promise<void>, onMenu: () => Promise<void>, scoreSystem: ScoreSystem, inputManager: InputManager, waveSystem: WaveSystem) {
        super();
        
        this.inputManager = inputManager;

        // Semi-transparent black background with gradient
        const background = new PIXI.Graphics();
        const gradient = {
            x0: 0,
            y0: 0,
            x1: 0,
            y1: height,
            colorStops: [
                { offset: 0, color: 0x000000, alpha: 0.9 },
                { offset: 0.5, color: 0x110000, alpha: 0.85 },
                { offset: 1, color: 0x000000, alpha: 0.9 }
            ]
        };
        
        // Create gradient background
        for (let i = 0; i < gradient.colorStops.length - 1; i++) {
            const start = gradient.colorStops[i];
            const end = gradient.colorStops[i + 1];
            const steps = 20;
            
            for (let j = 0; j < steps; j++) {
                const ratio = j / steps;
                const y = height * (i + ratio) / (gradient.colorStops.length - 1);
                const color = this.lerpColor(start.color, end.color, ratio);
                const alpha = start.alpha + (end.alpha - start.alpha) * ratio;
                
                background.beginFill(color, alpha);
                background.drawRect(0, y, width, height / steps / (gradient.colorStops.length - 1) + 1);
                background.endFill();
            }
        }
        this.addChild(background);

        // Create glow effect for game over text
        const glowSize = 80;
        const glow = new PIXI.Graphics();
        glow.beginFill(0xff0000, 0.2);
        glow.drawCircle(width / 2, height / 3 - 50, glowSize);
        glow.endFill();
        this.addChild(glow);

        // Game Over text with animation
        const gameOverText = new PIXI.Text('GAME OVER', GameOverScreen.STYLE);
        gameOverText.anchor.set(0.5);
        gameOverText.x = width / 2;
        gameOverText.y = height / 3 - 50;
        this.addChild(gameOverText);

        // Animate glow and text
        const animate = () => {
            if (!this.parent) return;
            
            // Pulse the glow
            const glowScale = 1 + Math.sin(Date.now() / 1000) * 0.1;
            glow.scale.set(glowScale);
            
            // Subtle text animation
            gameOverText.scale.x = 1 + Math.sin(Date.now() / 1200) * 0.03;
            gameOverText.scale.y = 1 + Math.sin(Date.now() / 1200) * 0.03;
            
            requestAnimationFrame(animate);
        };
        animate();

        // Score information
        scoreSystem.checkAndSaveHighScore();

        // Show sarcastic tip based on current wave
        const tipStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0x00ff00,
            align: 'center',
            fontStyle: 'italic',
            stroke: '#003300',
            strokeThickness: 2,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 2,
        });

        const waveDef = waveSystem.getCurrentWaveDefinition();
        const currentWave = waveSystem.getCurrentWave();
        let availableTips: string[] = [...GameOverScreen.GENERAL_TIPS];

        if (waveDef.isBossWave && waveDef.bossType) {
            // Add boss-specific tips
            const bossTips = GameOverScreen.BOSS_TIPS[waveDef.bossType] || [];
            availableTips = [...bossTips, ...availableTips];
        } else {
            // Add wave-based tips
            if (currentWave <= 3) {
                availableTips = [...GameOverScreen.WAVE_BASED_TIPS.early, ...availableTips];
            } else if (currentWave <= 7) {
                availableTips = [...GameOverScreen.WAVE_BASED_TIPS.mid, ...availableTips];
            } else if (currentWave <= 11) {
                availableTips = [...GameOverScreen.WAVE_BASED_TIPS.late, ...availableTips];
            } else {
                availableTips = [...GameOverScreen.WAVE_BASED_TIPS.expert, ...availableTips];
            }
        }

        const randomTip = availableTips[Math.floor(Math.random() * availableTips.length)];
        const tipText = new PIXI.Text(randomTip, tipStyle);
        tipText.anchor.set(0.5);
        tipText.x = width / 2;
        tipText.y = height / 3 + 80;
        tipText.style.wordWrap = true;
        tipText.style.wordWrapWidth = width * 0.7;
        this.addChild(tipText);


        // Create restart button
        const restartButton = this.createButton('Play Again', width / 2 - 120, height * 0.8);
        restartButton.on('mouseover', () => {
            this.setSelectedElement(0);
        });
        restartButton.on('click', async () => {
            console.log('[GameOverScreen] Play Again button clicked');
            await onRestart();
        });
        this.addChild(restartButton);
        
        // Add to selectable elements
        this.selectableElements.push({
            container: restartButton,
            onSelect: async () => {
                SoundManager.getInstance().playPowerUpSound();
                await onRestart();
            }
        });

        // Create menu button
        const menuButton = this.createButton('Main Menu', width / 2 + 120, height * 0.8);
        menuButton.on('mouseover', () => {
            this.setSelectedElement(1);
        });
        menuButton.on('click', async () => {
            console.log('[GameOverScreen] Main Menu button clicked');
            await onMenu();
        });
        this.addChild(menuButton);
        
        // Add to selectable elements
        this.selectableElements.push({
            container: menuButton,
            onSelect: async () => {
                SoundManager.getInstance().playPowerUpSound();
                await onMenu();
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
        
        // Start animation loop for gamepad input
        this.animate();
    }

    private createButton(text: string, x: number, y: number): PIXI.Container {
        const button = new PIXI.Container();
        
        // Button background
        const bg = new PIXI.Graphics();
        bg.lineStyle(3, 0xFFD700);
        bg.beginFill(0x000000, 0.5);
        bg.drawRoundedRect(0, 0, 200, 60, 15);
        bg.endFill();
        button.addChild(bg);

        // Button text
        const buttonText = new PIXI.Text(text, {
            fontFamily: 'Arial Black',
            fontSize: 28,
            fill: 0xFFD700,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        buttonText.position.set(100, 30);
        button.addChild(buttonText);

        // Position and interactivity
        button.position.set(x - 100, y - 30);
        button.interactive = true;
        button.cursor = 'pointer';

        // Hover effects
        button.on('mouseover', () => {
            bg.tint = 0x666666;
            buttonText.scale.set(1.1);
        });
        button.on('mouseout', () => {
            if (button !== this.selectableElements[this.currentSelectedIndex]?.container) {
                bg.tint = 0xFFFFFF;
                buttonText.scale.set(1);
            }
        });

        return button;
    }
    
    private animate(): void {
        if (!this.parent) return;
        
        // Handle gamepad UI navigation
        this.handleGamepadInput();
        
        requestAnimationFrame(() => this.animate());
    }
    
    private handleGamepadInput(): void {
        const now = Date.now();
        if (now - this.lastInputTime < this.INPUT_DEBOUNCE_TIME) return;
        
        // Check for gamepad input
        if (!this.inputManager.isUsingGamepad()) return;
        
        // Handle directional navigation
        if (this.inputManager.isMenuLeftTriggered()) {
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
    }
    
    private navigateMenu(direction: 'left' | 'right'): void {
        let newIndex = this.currentSelectedIndex;
        
        // Simple left/right navigation between buttons
        if (direction === 'left') {
            newIndex = 0; // Play Again button
        } else if (direction === 'right') {
            newIndex = 1; // Main Menu button
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
            
            // Reset scale on text
            if (prevElement.getChildAt(1) instanceof PIXI.Text) {
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
        
        // Scale up text
        if (element.getChildAt(1) instanceof PIXI.Text) {
            (element.getChildAt(1) as PIXI.Text).scale.set(1.1);
        }
        
        // Position the gamepad cursor
        if (this.gamepadCursor && this.inputManager.isUsingGamepad()) {
            this.gamepadCursor.visible = true;
            this.gamepadCursor.position.set(
                element.position.x,
                element.position.y
            );
            
            // Adjust cursor size based on element size
            this.gamepadCursor.clear();
            this.gamepadCursor.lineStyle(2, 0xFFFFFF, 0.8);
            this.gamepadCursor.drawRoundedRect(-5, -5, 210, 70, 10);
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

    private lerpColor(color1: number, color2: number, ratio: number): number {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;
        
        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;
        
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        return (r << 16) | (g << 8) | b;
    }
} 