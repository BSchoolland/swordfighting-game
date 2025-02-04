import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { BossEnemy } from '../entities/enemies/BossEnemy';

export interface HighScore {
    score: number;
    wave: number;
    date: string;
}

export class ScoreSystem {
    private static readonly STORAGE_KEY = 'pixel_rage_high_scores';
    private static readonly MAX_HIGH_SCORES = 3;
    
    private currentScore: number = 0;
    private highestWave: number = 1;

    constructor() {
        // Initialize if no high scores exist
        if (!localStorage.getItem(ScoreSystem.STORAGE_KEY)) {
            this.saveHighScores([]);
        }
    }

    public addScore(enemy: BaseEnemy): void {
        // Base score for regular enemies
        let points = 10;

        // Bonus points for boss enemies
        if (enemy instanceof BossEnemy) {
            points = 100;
        }

        this.currentScore += points;
        console.log(`[ScoreSystem] Added ${points} points. Current score: ${this.currentScore}`);
    }

    public setWave(wave: number): void {
        this.highestWave = Math.max(this.highestWave, wave);
    }

    public getCurrentScore(): number {
        return this.currentScore;
    }

    public getHighestWave(): number {
        return this.highestWave;
    }

    public checkAndSaveHighScore(): boolean {
        const highScores = this.getHighScores();
        const newScore: HighScore = {
            score: this.currentScore,
            wave: this.highestWave,
            date: new Date().toISOString()
        };

        // Check if this is a new high score
        const isHighScore = highScores.length < ScoreSystem.MAX_HIGH_SCORES ||
            highScores.some(score => newScore.score > score.score);

        if (isHighScore) {
            highScores.push(newScore);
            highScores.sort((a, b) => b.score - a.score);
            if (highScores.length > ScoreSystem.MAX_HIGH_SCORES) {
                highScores.pop();
            }
            this.saveHighScores(highScores);
        }

        return isHighScore;
    }

    public reset(): void {
        this.currentScore = 0;
        this.highestWave = 1;
    }

    private saveHighScores(scores: HighScore[]): void {
        localStorage.setItem(ScoreSystem.STORAGE_KEY, JSON.stringify(scores));
    }

    public getHighScores(): HighScore[] {
        const scores = localStorage.getItem(ScoreSystem.STORAGE_KEY);
        return scores ? JSON.parse(scores) : [];
    }
} 