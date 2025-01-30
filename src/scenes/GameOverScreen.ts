import * as PIXI from 'pixi.js';
import { HighScore, ScoreSystem } from '../systems/ScoreSystem';

export class GameOverScreen extends PIXI.Container {
    private static readonly STYLE = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xff0000,
        align: 'center'
    });

    constructor(width: number, height: number, onRestart: () => void, onMenu: () => void, scoreSystem: ScoreSystem) {
        super();

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

        const scoreText = new PIXI.Text(
            `Score: ${currentScore}\nWaves Cleared: ${waveReached}`,
            scoreStyle
        );
        scoreText.anchor.set(0.5);
        scoreText.x = width / 2;
        scoreText.y = height / 3 + 20;
        this.addChild(scoreText);

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
        restartButton.on('click', () => {
            console.log('[GameOverScreen] Play Again button clicked');
            onRestart();
        });
        this.addChild(restartButton);

        // Create menu button
        const menuButton = this.createButton('Main Menu', width / 2 + 120, height * 0.8);
        menuButton.on('click', () => {
            console.log('[GameOverScreen] Main Menu button clicked');
            onMenu();
        });
        this.addChild(menuButton);
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
            bg.tint = 0xFFFFFF;
            buttonText.scale.set(1);
        });

        return button;
    }
} 