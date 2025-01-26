import * as PIXI from 'pixi.js';

export class GameOverScreen extends PIXI.Container {
    private static readonly STYLE = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xff0000,
        align: 'center'
    });

    constructor(width: number, height: number) {
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
        gameOverText.y = height / 2 - 50;
        this.addChild(gameOverText);

        // Restart instruction
        const restartStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
        });
        const restartText = new PIXI.Text('Press R to Restart', restartStyle);
        restartText.anchor.set(0.5);
        restartText.x = width / 2;
        restartText.y = height / 2 + 50;
        this.addChild(restartText);
    }
} 