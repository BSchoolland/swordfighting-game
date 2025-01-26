import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';

export class GameScene extends PIXI.Container {
    private player: Player;
    private keys: Set<string> = new Set();

    constructor(dimensions: { width: number; height: number }) {
        super();

        // Create player with fixed game world bounds
        this.player = new Player(dimensions);
        this.player.x = dimensions.width / 2;
        this.player.y = dimensions.height / 2;
        this.addChild(this.player);

        // Setup input handling
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    }

    public update(): void {
        this.player.update(this.keys);
    }
} 