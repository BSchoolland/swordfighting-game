// TODO: PIXI is imported but never used. Consider removing if not needed for type checking.
import * as PIXI from 'pixi.js';
import { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { BasicEnemy } from '../entities/enemies/BasicEnemy';
import { FastEnemy } from '../entities/enemies/FastEnemy';
import { TankEnemy } from '../entities/enemies/TankEnemy';
import { RangedEnemy } from '../entities/enemies/RangedEnemy';
import { SpearEnemy } from '../entities/enemies/SpearEnemy';
import { BlitzerEnemy } from '../entities/enemies/BlitzerEnemy';
import { FlankerEnemy } from '../entities/enemies/FlankerEnemy';
import { BoomerangEnemy } from '../entities/enemies/BoomerangEnemy';
import { WarriorBoss } from '../entities/enemies/WarriorBoss';
import { BerserkerBoss } from '../entities/enemies/BerserkerBoss';
import { HunterBoss } from '../entities/enemies/HunterBoss';
import { MasterOfArmsBoss } from '../entities/enemies/MasterOfArmsBoss';
import { SoundManager } from './SoundManager';
import { UpgradeSystem } from './UpgradeSystem';

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
    isBossWave?: boolean;
    bossType?: string;
    minionInterval?: number; // For boss waves, how many minions spawn per minute
    minionTypes?: Array<keyof WaveComposition>; // Types of minions that can spawn during boss fight
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
        composition: { ...zeroComposition, basicEnemies: 5, fastEnemies: 2},
        spawnDelay: 1000,
        description: "Swift Attackers"
    },
    
    // Wave 3: Tank Introduction
    {
        composition: { ...zeroComposition, tankEnemies: 2, basicEnemies: 7, fastEnemies: 1 },
        spawnDelay: 1500,
        description: "Heavy Resistance"
    },
    
    // Boss Wave: Warrior Boss
    {
        composition: { ...zeroComposition, basicEnemies: 1, fastEnemies: 1 }, // Minion composition
        spawnDelay: 5000, // Slow minion spawn rate
        description: "",
        isBossWave: true,
        bossType: "warrior",
        minionInterval: 4, // every 4 seconds
        minionTypes: ['basicEnemies', 'fastEnemies'] // Can spawn both basic and fast enemies as minions
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
            spearEnemies: 2,
            tankEnemies: 2,
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
            fastEnemies: 5,
            blitzerEnemies: 2,
            basicEnemies: 2,
            spearEnemies: 1,
            rangedEnemies: 2
        },
        spawnDelay: 800,
        description: "Speed Demons"
    },
    
    // Boss Wave: Berserker Boss
    {
        composition: { ...zeroComposition, rangedEnemies: 4, blitzerEnemies: 3 },
        spawnDelay: 4000,
        description: "He has no chill",
        isBossWave: true,
        bossType: "berserker",
        minionInterval: 5,
        minionTypes: ['rangedEnemies', 'blitzerEnemies']
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
    // Boss Wave: Hunter Boss
    {
        composition: { ...zeroComposition, rangedEnemies: 2, flankerEnemies: 2, tankEnemies: 2 },
        spawnDelay: 4000,
        description: "pew pew",
        isBossWave: true,
        bossType: "hunter",
        minionInterval: 5, // every 5 seconds
        minionTypes: ['rangedEnemies', 'flankerEnemies', 'tankEnemies']
    },
    // Wave 11: Elite Army
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
    },
    // Wave 12: Ironclad Invasion
    {
        composition: {
            ...zeroComposition,
            tankEnemies: 8,
            basicEnemies: 10,
            fastEnemies: 6,
            spearEnemies: 6,
        },
        spawnDelay: 700,
        description: "Ironclad Invasion"
    },

    // Wave 13: The last wave
    {
        composition: {
            ...zeroComposition,
            rangedEnemies: 5,
            flankerEnemies: 5,
            boomerangEnemies: 5,
            tankEnemies: 5,
            basicEnemies: 5,
            fastEnemies: 5,
            spearEnemies: 5,
            blitzerEnemies: 5,
        },
        spawnDelay: 700,
        description: "The last wave"
    },

    // Final Boss: Master of Arms
    {
        composition: { ...zeroComposition, rangedEnemies: 4, flankerEnemies: 4, tankEnemies: 4, basicEnemies: 4, fastEnemies: 4, spearEnemies: 4, blitzerEnemies: 4, boomerangEnemies: 4 },
        spawnDelay: 4000,
        description: "",
        isBossWave: true,
        bossType: "master",
        minionInterval: 4, // every 4 seconds
        minionTypes: ['rangedEnemies', 'flankerEnemies', 'tankEnemies', 'basicEnemies', 'fastEnemies', 'spearEnemies', 'blitzerEnemies', 'boomerangEnemies']
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
    private currentBoss: Entity | null = null;
    private upgradeSystem: UpgradeSystem;

    constructor(bounds: { width: number; height: number }, player: Player, enemies: Entity[], upgradeSystem: UpgradeSystem) {
        this.bounds = bounds;
        this.player = player;
        this.enemies = enemies;
        this.upgradeSystem = upgradeSystem;
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

        // Start boss music if it's a boss wave
        if (waveDef.isBossWave) {
            SoundManager.getInstance().transitionToBossMusic();
        }
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
        // Final boss wave
        
        // Regular boss waves
        if (this.currentWave % 4 === 0) {
            const bossWaves = [
                {
                    bossType: 'warrior',
                    description: "Big boi",
                    minions: ['basicEnemies', 'fastEnemies']
                },
                {
                    bossType: 'berserker',
                    description: "He has no chill",
                    minions: ['rangedEnemies', 'blitzerEnemies']
                },
                {
                    bossType: 'hunter',
                    description: "Pew pew!",
                    minions: ['rangedEnemies', 'flankerEnemies', 'tankEnemies']
                },
                {
                    bossType: 'master',
                    description: "The final boss",
                    minions: ['rangedEnemies', 'flankerEnemies', 'tankEnemies', 'basicEnemies', 'fastEnemies', 'spearEnemies', 'blitzerEnemies', 'boomerangEnemies']
                }
            ];

            const bossIndex = (this.currentWave / 4 - 1) % bossWaves.length;
            const bossWave = bossWaves[bossIndex];

            return {
                composition: {
                    basicEnemies: 0,
                    fastEnemies: 0,
                    tankEnemies: 0,
                    rangedEnemies: 0,
                    spearEnemies: 0,
                    blitzerEnemies: 0,
                    flankerEnemies: 0,
                    boomerangEnemies: 0
                },
                spawnDelay: 1000,
                description: bossWave.description,
                isBossWave: true,
                bossType: bossWave.bossType,
                minionInterval: 4,
                minionTypes: bossWave.minions as Array<keyof WaveComposition>
            };
        }

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

    private spawnBoss(type: string): void {
        let boss: Entity | null = null;
        
        switch (type) {
            case 'warrior':
                boss = new WarriorBoss(this.bounds, this.player);
                break;
            case 'berserker':
                boss = new BerserkerBoss(this.bounds, this.player);
                break;
            case 'hunter':
                boss = new HunterBoss(this.bounds, this.player);
                break;
            case 'master':
                boss = new MasterOfArmsBoss(this.bounds, this.player);
                break;
        }

        if (boss) {
            // Position boss at center top of screen
            boss.x = this.bounds.width / 2;
            boss.y = -50;

            this.enemies.push(boss);
            this.currentBoss = boss;
            if ('onAddedToScene' in boss) {
                (boss as any).onAddedToScene();
            }
        }
    }

    public update(delta: number): void {
        if (!this.waveActive) return;

        const waveDef = this.getCurrentWaveDefinition();
        
        // Handle boss wave
        if (waveDef.isBossWave) {
            // Spawn boss if not spawned
            if (!this.currentBoss && this.enemiesSpawned === 0) {
                this.spawnBoss(waveDef.bossType!);
                this.enemiesSpawned++;
            }

            // Check if boss is dead
            if (this.currentBoss && !this.currentBoss.isAlive()) {
                this.waveActive = false;
                this.currentBoss = null;
                // Heal player by 30% of max health
                const healAmount = Math.floor(this.player.getMaxHealth() * 0.3);
                this.player.heal(healAmount);
                SoundManager.getInstance().playHealSound();
                // Transition back to normal music when boss dies
                SoundManager.getInstance().transitionToNormalMusic();
                // Don't start next wave if it was the Master of Arms
                if (waveDef.bossType === 'master') {
                    return;
                }
                return;
            }

            // Spawn minions periodically if boss is alive
            if (this.currentBoss && this.currentBoss.isAlive() && waveDef.minionInterval && waveDef.minionInterval > 0) {
                this.spawnTimer += delta * 1000;
                const spawnInterval = waveDef.minionInterval * 1000;
                if (this.spawnTimer >= spawnInterval) {
                    this.spawnTimer = 0;
                    if (this.spawnQueue.length === 0 && waveDef.minionTypes) {
                        // Create a new spawn queue with just the allowed minion types
                        const minionComposition = { ...zeroComposition };
                        waveDef.minionTypes.forEach(type => {
                            minionComposition[type] = 1; // Add one of each type to the queue
                        });
                        this.createSpawnQueue(minionComposition);
                    }
                    if (this.spawnQueue.length > 0) {
                        const enemyType = this.spawnQueue.pop()!;
                        this.spawnEnemy(enemyType);
                    }
                }
            }
        } else {
            // Normal wave behavior
            const totalEnemies = this.getTotalEnemies(waveDef.composition);
            this.spawnTimer += delta * 1000;

            if (this.enemiesSpawned < totalEnemies && this.spawnTimer >= waveDef.spawnDelay) {
                this.spawnTimer = 0;
                
                if (this.spawnQueue.length > 0) {
                    const enemyType = this.spawnQueue.pop()!;
                    this.spawnEnemy(enemyType);
                }
            }

            // Check if wave is complete (all enemies spawned and none alive)
            if (this.enemiesSpawned >= totalEnemies && this.enemies.length === 0) {
                this.waveActive = false;
                // Heal player by 30% of max health between waves
                const healAmount = Math.floor(this.player.getMaxHealth() * 0.3);
                this.player.heal(healAmount);
                SoundManager.getInstance().playHealSound();
            }
        }
    }
} 