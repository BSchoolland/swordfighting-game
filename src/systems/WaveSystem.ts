import { Entity } from '../entities/Entity';
import { BasicEnemy } from '../entities/enemies/BasicEnemy';
import { FastEnemy } from '../entities/enemies/FastEnemy';
import { TankEnemy } from '../entities/enemies/TankEnemy';
import { RangedEnemy } from '../entities/enemies/RangedEnemy';
import { SpearEnemy } from '../entities/enemies/SpearEnemy';
import { BlitzerEnemy } from '../entities/enemies/BlitzerEnemy';
import { FlankerEnemy } from '../entities/enemies/FlankerEnemy';
import { BoomerangEnemy } from '../entities/enemies/BoomerangEnemy';
import { Player } from '../entities/Player';

interface WaveComposition {
    basicEnemies: number;
    fastEnemies: number;
    tankEnemies: number;
    rangedEnemies: number;
    spearEnemies: number;
    blitzerEnemies: number;
    flankerEnemies: number;
    boomerangEnemies: number;
}

interface WaveDefinition {
    composition: WaveComposition;
    spawnDelay: number;  // Time between enemy spawns in ms
    description: string; // For wave announcements
}

const zeroComposition: WaveComposition = {
    basicEnemies: 0,
    fastEnemies: 0,
    tankEnemies: 0,
    rangedEnemies: 0,
    spearEnemies: 0,
    blitzerEnemies: 0,
    flankerEnemies: 0,
    boomerangEnemies: 0
};

const WAVE_DEFINITIONS: WaveDefinition[] = [
    // Wave 1: Introduction - Just basic enemies
    {
        composition: { ...zeroComposition, basicEnemies: 3 },
        spawnDelay: 1000,
        description: "The First Wave"
    },
    
    // Wave 2: Basic + Fast - Learning to deal with speed
    {
        composition: { ...zeroComposition, basicEnemies: 5, fastEnemies: 2 },
        spawnDelay: 1000,
        description: "Swift Attackers"
    },
    
    // Wave 3: Tank Introduction
    {
        composition: { ...zeroComposition, tankEnemies: 2, basicEnemies: 7, fastEnemies: 1 },
        spawnDelay: 1500,
        description: "Heavy Resistance"
    },
    
    // Wave 4: Ranged Introduction
    {
        composition: { 
            ...zeroComposition,
            rangedEnemies: 3, 
            basicEnemies: 6,
            fastEnemies: 3,
        },
        spawnDelay: 1200,
        description: "Arrows from Afar"
    },
    
    // Wave 5: Spear + Tank Combo
    {
        composition: {
            ...zeroComposition,
            spearEnemies: 4,
            tankEnemies: 3,
            basicEnemies: 6,
            rangedEnemies: 2,
        },
        spawnDelay: 1000,
        description: "Defensive Formation"
    },
    
    // Wave 6: Fast Assault
    {
        composition: {
            ...zeroComposition,
            fastEnemies: 6,
            blitzerEnemies: 3,
            basicEnemies: 2,
            spearEnemies: 1,
            rangedEnemies: 2
        },
        spawnDelay: 800,
        description: "Speed Demons"
    },
    
    // Wave 7: Ranged Masters
    {
        composition: {
            ...zeroComposition,
            rangedEnemies: 8,
            tankEnemies: 3,
            blitzerEnemies: 3,
            fastEnemies: 2,
        },
        spawnDelay: 800,
        description: "Rain of Death"
    },
    // Basic ambush
    {
        composition: {
            ...zeroComposition,
            basicEnemies: 30,
        },
        spawnDelay: 200,
        description: "Basic Ambush"
    },
    // Wave 9: Ninjas
    {
        composition: {
            ...zeroComposition,
            flankerEnemies: 4,
            boomerangEnemies: 2,
            spearEnemies: 3,
            rangedEnemies: 1,
            blitzerEnemies: 2,
        },
        spawnDelay: 700,
        description: "Ninjas"
    },
    
    // Wave 10: Elite Army
    {
        composition: {
            ...zeroComposition,
            blitzerEnemies: 3,
            flankerEnemies: 3,
            boomerangEnemies: 3,
            tankEnemies: 3,
            rangedEnemies: 3,
            fastEnemies: 3
        },
        spawnDelay: 700,
        description: "Elite Army"
    }
];

export class WaveSystem {
    private currentWave: number = 0;
    private enemiesSpawned: number = 0;
    private spawnTimer: number = 0;
    private bounds: { width: number; height: number };
    private player: Player;
    private enemies: Entity[];
    private waveActive: boolean = false;
    private spawnQueue: Array<keyof WaveComposition> = [];

    constructor(bounds: { width: number; height: number }, player: Player, enemies: Entity[]) {
        this.bounds = bounds;
        this.player = player;
        this.enemies = enemies;
    }

    private createSpawnQueue(composition: WaveComposition): void {
        this.spawnQueue = [];
        // Create an array of enemy types based on their counts
        for (const [type, count] of Object.entries(composition)) {
            for (let i = 0; i < count; i++) {
                this.spawnQueue.push(type as keyof WaveComposition);
            }
        }
        // Shuffle the array
        for (let i = this.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
        }
    }

    public getCurrentWave(): number {
        return this.currentWave;
    }

    public isWaveActive(): boolean {
        return this.waveActive;
    }

    public startNextWave(): void {
        this.currentWave++;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.waveActive = true;
        const waveDef = this.getCurrentWaveDefinition();
        this.createSpawnQueue(waveDef.composition);
        console.log(`[WaveSystem] Starting wave ${this.currentWave}: ${waveDef.description}`);
    }

    public setEnemiesArray(enemies: Entity[]): void {
        this.enemies = enemies;
    }

    public setWave(waveNumber: number): void {
        // Reset wave state
        this.currentWave = waveNumber - 1; // Subtract 1 because startNextWave will increment it
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.waveActive = false; // Will be set to true in startNextWave
        this.spawnQueue = []; // Clear the spawn queue
        
        // Start the new wave
        this.startNextWave();
    }

    public getCurrentWaveDefinition(): WaveDefinition {
        const index = Math.min(this.currentWave - 1, WAVE_DEFINITIONS.length - 1);
        return WAVE_DEFINITIONS[index];
    }

    private spawnEnemy(type: keyof WaveComposition): void {
        let enemy: Entity;
        
        switch(type) {
            case 'basicEnemies':
                enemy = new BasicEnemy(this.bounds, this.player);
                break;
            case 'fastEnemies':
                enemy = new FastEnemy(this.bounds, this.player);
                break;
            case 'tankEnemies':
                enemy = new TankEnemy(this.bounds, this.player);
                break;
            case 'rangedEnemies':
                enemy = new RangedEnemy(this.bounds, this.player);
                break;
            case 'spearEnemies':
                enemy = new SpearEnemy(this.bounds, this.player);
                break;
            case 'blitzerEnemies':
                enemy = new BlitzerEnemy(this.bounds, this.player);
                break;
            case 'flankerEnemies':
                enemy = new FlankerEnemy(this.bounds, this.player);
                break;
            case 'boomerangEnemies':
                enemy = new BoomerangEnemy(this.bounds, this.player);
                break;
            default:
                console.error(`Unknown enemy type: ${type}`);
                return;
        }

        // Position enemy at a random edge of the screen
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Top
                enemy.x = Math.random() * this.bounds.width;
                enemy.y = -50;
                break;
            case 1: // Right
                enemy.x = this.bounds.width + 50;
                enemy.y = Math.random() * this.bounds.height;
                break;
            case 2: // Bottom
                enemy.x = Math.random() * this.bounds.width;
                enemy.y = this.bounds.height + 50;
                break;
            case 3: // Left
                enemy.x = -50;
                enemy.y = Math.random() * this.bounds.height;
                break;
        }

        this.enemies.push(enemy);
        this.enemiesSpawned++;
    }

    private getTotalEnemies(composition: WaveComposition): number {
        return Object.values(composition).reduce((sum, count) => sum + count, 0);
    }

    public update(delta: number): void {
        if (!this.waveActive) return;

        const waveDef = this.getCurrentWaveDefinition();
        const totalEnemies = this.getTotalEnemies(waveDef.composition);
        
        // Update spawn timer
        this.spawnTimer += delta * 1000; // Convert to milliseconds

        // Check if it's time to spawn an enemy
        if (this.enemiesSpawned < totalEnemies && this.spawnTimer >= waveDef.spawnDelay) {
            this.spawnTimer = 0;
            
            if (this.spawnQueue.length > 0) {
                const enemyType = this.spawnQueue.pop()!;
                this.spawnEnemy(enemyType);
            }

            // Check if wave is complete
            if (this.enemiesSpawned >= totalEnemies) {
                this.waveActive = false;
            }
        }
    }
} 