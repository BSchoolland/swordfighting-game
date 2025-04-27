import * as PIXI from 'pixi.js';
// @ts-ignore - HighScore type is used in ScoreSystem
import { HighScore, ScoreSystem } from '../systems/ScoreSystem';
import { InputManager } from '../systems/InputManager';
import { SoundManager } from '../systems/SoundManager';

interface SelectableElement {
    container: PIXI.Container;
    onSelect?: () => void;
}

export class GameOverScreen extends PIXI.Container {
    private static readonly STYLE = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xff0000,
        align: 'center'
    });
    
    // UI Navigation elements
    private inputManager: InputManager;
    private selectableElements: SelectableElement[] = [];
    private currentSelectedIndex: number = 0;
    private gamepadCursor: PIXI.Graphics | null = null;
    private lastInputTime: number = 0;
    private readonly INPUT_DEBOUNCE_TIME = 200; // ms

    constructor(width: number, height: number, onRestart: () => Promise<void>, onMenu: () => Promise<void>, scoreSystem: ScoreSystem, inputManager: InputManager) {
        super();
        
        this.inputManager = inputManager;

        // Semi-transparent black background
        const background = new PIXI.Graphics();
        background.beginFill(0x000000, 0.7);
        background.drawRect(0, 0, width, height);
        background.endFill();
        this.addChild(background);

        // Game Over text
        const gameOverText = new PIXI.Text('GAME OVER', GameOverScreen.STYLE);
        gameOverText.anchor.set(0.5);
        gameOverText.x = width / 2;
        gameOverText.y = height / 3 - 50;
        this.addChild(gameOverText);

        // Score information
        const currentScore = scoreSystem.getCurrentScore();
        const waveReached = scoreSystem.getHighestWave();
        const isHighScore = scoreSystem.checkAndSaveHighScore();

        // Create score text
        const scoreStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 32,
            fill: 0xFFD700,
            align: 'center'
        });


        // Show "New High Score!" if achieved
        if (isHighScore) {
            const highScoreText = new PIXI.Text('New High Score!', {
                fontFamily: 'Arial',
                fontSize: 36,
                fill: 0x00ff00,
                align: 'center'
            });
            highScoreText.anchor.set(0.5);
            highScoreText.x = width / 2;
            highScoreText.y = height / 3 + 80;
            this.addChild(highScoreText);
        }

        // Show high scores
        const highScores = scoreSystem.getHighScores();
        if (highScores.length > 0) {
            const highScoreStyle = new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xffffff,
                align: 'left'
            });

            const highScoreTitle = new PIXI.Text('High Scores:', highScoreStyle);
            highScoreTitle.x = width / 2 - 150;
            highScoreTitle.y = height / 2;
            this.addChild(highScoreTitle);

            highScores.forEach((score, index) => {
                const date = new Date(score.date).toLocaleDateString();
                const scoreEntry = new PIXI.Text(
                    `${index + 1}. ${score.score} pts - Wave ${score.wave} (${date})`,
                    highScoreStyle
                );
                scoreEntry.x = width / 2 - 150;
                scoreEntry.y = height / 2 + 40 + (index * 30);
                this.addChild(scoreEntry);
            });
        }

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
                (prevElement.getChildAt(0) as PIXI.Graphics).tint = 0xFFFFFF;
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
            (element.getChildAt(0) as PIXI.Graphics).tint = 0x666666;
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
} 