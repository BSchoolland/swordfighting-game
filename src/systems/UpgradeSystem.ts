import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { SoundManager } from './SoundManager';

export enum UpgradeRarity {
    COMMON = 'Common',
    RARE = 'Rare',
    EPIC = 'Epic',
    LEGENDARY = 'Legendary'
}

export enum UpgradeType {
    SPEED = 'Speed',
    DASH = 'Dash',
    SWORD = 'Sword',
    SWING_SPEED = 'Swing Speed',
    MAX_HEALTH = 'Max Health'
}

export interface Upgrade {
    id: string;
    name: string;
    description: string;
    rarity: UpgradeRarity;
    type: UpgradeType;
    apply: (player: Player) => void;
    isHealing?: boolean;
}

export class UpgradeSystem extends PIXI.Container {
    private static readonly CARD_WIDTH = 250;
    private static readonly CARD_HEIGHT = 350;
    private static readonly CARD_SPACING = 40;
    private static readonly BACKGROUND_ALPHA = 0.85;
    
    private static readonly RARITY_COLORS = {
        [UpgradeRarity.COMMON]: 0x666666,
        [UpgradeRarity.RARE]: 0x0088ff,
        [UpgradeRarity.EPIC]: 0xaa00ff,
        [UpgradeRarity.LEGENDARY]: 0xffaa00
    };

    private static readonly RARITY_WEIGHTS = {
        [UpgradeRarity.COMMON]: 55,
        [UpgradeRarity.RARE]: 25,
        [UpgradeRarity.EPIC]: 15,
        [UpgradeRarity.LEGENDARY]: 5
    };

    private static readonly BOSS_RARITY_WEIGHTS = {
        [UpgradeRarity.COMMON]: 0,    // No common upgrades after boss
        [UpgradeRarity.RARE]: 25,      // No rare upgrades after boss
        [UpgradeRarity.EPIC]: 62,     // Higher chance for epic
        [UpgradeRarity.LEGENDARY]: 13  // Good chance for legendary
    };
    
    private upgrades: Upgrade[] = [];
    private player: Player;
    private dimensions: { width: number; height: number };
    private isVisible: boolean = false;
    private soundManager: SoundManager;
    private background: PIXI.Graphics;
    private cards: PIXI.Container[] = [];
    private particleContainers: PIXI.Container[] = [];
    private lastCheckedLevel: number = 1;
    
    // Track chosen upgrades
    private chosenUpgrades: Map<UpgradeType, Upgrade> = new Map();
    private static readonly MAX_REROLL_ATTEMPTS = 5;
    private onUpgradeSelected: (() => void) | null = null;

    constructor(dimensions: { width: number; height: number }, player: Player) {
        super();
        this.dimensions = dimensions;
        this.player = player;
        this.soundManager = SoundManager.getInstance();
        this.lastCheckedLevel = player.getLevel();
        
        this.initializeUpgrades();
        
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000, UpgradeSystem.BACKGROUND_ALPHA);
        this.background.drawRect(0, 0, dimensions.width, dimensions.height);
        this.background.endFill();
        this.addChild(this.background);
        
        this.visible = false;
    }

    private initializeUpgrades(): void {
        const healingUpgrade: Upgrade = {
            id: 'healing',
            name: 'Divine Healing',
            description: 'Restore 100% of your health',
            rarity: UpgradeRarity.EPIC,
            type: UpgradeType.MAX_HEALTH,
            apply: (player: Player) => player.heal(player.getMaxHealth()),
            isHealing: true
        };

        this.upgrades = [
            // Speed Upgrades
            {
                id: 'speed_common',
                name: 'Swift Feet',
                description: 'Increase movement speed by 15%',
                rarity: UpgradeRarity.COMMON,
                type: UpgradeType.SPEED,
                apply: (player: Player) => player.increaseSpeed(0.15)
            },
            {
                id: 'speed_rare',
                name: 'Fleet Foot',
                description: 'Increase movement speed by 30%',
                rarity: UpgradeRarity.RARE,
                type: UpgradeType.SPEED,
                apply: (player: Player) => player.increaseSpeed(0.3)
            },
            {
                id: 'speed_epic',
                name: 'Wind Walker',
                description: 'Increase movement speed by 50%',
                rarity: UpgradeRarity.EPIC,
                type: UpgradeType.SPEED,
                apply: (player: Player) => player.increaseSpeed(0.5)
            },
            {
                id: 'speed_legendary',
                name: 'Avatar of Mercury',
                description: 'Increase movement speed by 75%',
                rarity: UpgradeRarity.LEGENDARY,
                type: UpgradeType.SPEED,
                apply: (player: Player) => player.increaseSpeed(0.75)
            },
            
            // Dash Upgrades
            {
                id: 'dash_common',
                name: 'Quick Recovery',
                description: 'Reduce dash cooldown by 15%',
                rarity: UpgradeRarity.COMMON,
                type: UpgradeType.DASH,
                apply: (player: Player) => player.getDash().reduceCooldown(0.15)
            },
            {
                id: 'dash_rare',
                name: 'Swift Recovery',
                description: 'Reduce dash cooldown by 20%',
                rarity: UpgradeRarity.RARE,
                type: UpgradeType.DASH,
                apply: (player: Player) => player.getDash().reduceCooldown(0.2)
            },
            {
                id: 'dash_epic',
                name: 'Shadow Step',
                description: 'Reduce dash cooldown by 25%',
                rarity: UpgradeRarity.EPIC,
                type: UpgradeType.DASH,
                apply: (player: Player) => player.getDash().reduceCooldown(0.25)
            },
            {
                id: 'dash_legendary',
                name: 'Time Weaver',
                description: 'Reduce dash cooldown by 50%',
                rarity: UpgradeRarity.LEGENDARY,
                type: UpgradeType.DASH,
                apply: (player: Player) => player.getDash().reduceCooldown(0.5)
            },
            
            // Sword Upgrades
            {
                id: 'sword_common',
                name: 'Longer Reach',
                description: 'Increase sword length by 15%',
                rarity: UpgradeRarity.COMMON,
                type: UpgradeType.SWORD,
                apply: (player: Player) => player.increaseSwordLength(0.15)
            },
            {
                id: 'sword_rare',
                name: 'Extended Reach',
                description: 'Increase sword length by 20%',
                rarity: UpgradeRarity.RARE,
                type: UpgradeType.SWORD,
                apply: (player: Player) => player.increaseSwordLength(0.2)
            },
            {
                id: 'sword_epic',
                name: 'Blade of the Giant',
                description: 'Increase sword length by 25%',
                rarity: UpgradeRarity.EPIC,
                type: UpgradeType.SWORD,
                apply: (player: Player) => player.increaseSwordLength(0.25)
            },
            {
                id: 'sword_legendary',
                name: 'Cosmic Blade',
                description: 'Increase sword length by 40%',
                rarity: UpgradeRarity.LEGENDARY,
                type: UpgradeType.SWORD,
                apply: (player: Player) => player.increaseSwordLength(0.4)
            },

            // Swing Speed Upgrades
            {
                id: 'swing_common',
                name: 'Quick Strikes',
                description: 'Increase attack speed by 25%',
                rarity: UpgradeRarity.COMMON,
                type: UpgradeType.SWING_SPEED,
                apply: (player: Player) => player.increaseSwingSpeed(0.25)
            },
            {
                id: 'swing_rare',
                name: 'Swift Blade',
                description: 'Increase attack speed by 40%',
                rarity: UpgradeRarity.RARE,
                type: UpgradeType.SWING_SPEED,
                apply: (player: Player) => player.increaseSwingSpeed(0.4)
            },
            {
                id: 'swing_epic',
                name: 'Blade Dance',
                description: 'Increase attack speed by 60%',
                rarity: UpgradeRarity.EPIC,
                type: UpgradeType.SWING_SPEED,
                apply: (player: Player) => player.increaseSwingSpeed(0.6)
            },
            {
                id: 'swing_legendary',
                name: 'Time Distortion',
                description: 'Increase attack speed by 90%',
                rarity: UpgradeRarity.LEGENDARY,
                type: UpgradeType.SWING_SPEED,
                apply: (player: Player) => player.increaseSwingSpeed(0.9)
            },

            // Max Health Upgrades
            {
                id: 'health_common',
                name: 'Tough Skin',
                description: 'Increase max health by 15%',
                rarity: UpgradeRarity.COMMON,
                type: UpgradeType.MAX_HEALTH,
                apply: (player: Player) => player.increaseMaxHealth(0.15)
            },
            {
                id: 'health_rare',
                name: 'Iron Body',
                description: 'Increase max health by 25%',
                rarity: UpgradeRarity.RARE,
                type: UpgradeType.MAX_HEALTH,
                apply: (player: Player) => player.increaseMaxHealth(0.25)
            },
            {
                id: 'health_epic',
                name: 'Titan\'s Endurance',
                description: 'Increase max health by 50%',
                rarity: UpgradeRarity.EPIC,
                type: UpgradeType.MAX_HEALTH,
                apply: (player: Player) => player.increaseMaxHealth(0.5)
            },
            {
                id: 'health_legendary',
                name: 'Immortal Vessel',
                description: 'Increase max health by 100%',
                rarity: UpgradeRarity.LEGENDARY,
                type: UpgradeType.MAX_HEALTH,
                apply: (player: Player) => player.increaseMaxHealth(1)
            }
        ];

        // Add healing upgrade
        this.upgrades.push(healingUpgrade);
    }

    private createParticleEffect(rarity: UpgradeRarity): PIXI.Container {
        const container = new PIXI.Container();
        const color = UpgradeSystem.RARITY_COLORS[rarity];
        
        // Create different particle effects based on rarity
        for (let i = 0; i < (rarity === UpgradeRarity.LEGENDARY ? 20 : 10); i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(color);
            
            if (rarity === UpgradeRarity.LEGENDARY) {
                // Create a star-like shape using polygon
                const points: number[] = [];
                const spikes = 5;
                const outerRadius = 4;
                const innerRadius = 2;
                
                for (let i = 0; i < spikes * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / spikes;
                    points.push(
                        Math.cos(angle) * radius,
                        Math.sin(angle) * radius
                    );
                }
                
                particle.drawPolygon(points);
            } else {
                particle.drawCircle(0, 0, 2);
            }
            
            particle.endFill();
            particle.alpha = 0.6;
            
            // Random starting position
            particle.x = Math.random() * UpgradeSystem.CARD_WIDTH;
            particle.y = Math.random() * UpgradeSystem.CARD_HEIGHT;
            
            container.addChild(particle);
            
            // Animate particles
            const animate = () => {
                particle.y -= 0.5;
                particle.alpha -= 0.005;
                
                if (particle.alpha <= 0) {
                    particle.y = UpgradeSystem.CARD_HEIGHT;
                    particle.alpha = 0.6;
                }
                
                requestAnimationFrame(animate);
            };
            
            animate();
        }
        
        return container;
    }

    public update(): void {
        const currentLevel = this.player.getLevel();
        if (currentLevel > this.lastCheckedLevel) {
            this.showUpgradeSelection(false);
            this.lastCheckedLevel = currentLevel;
        }
    }

    public showUpgradeSelection(isBossWave: boolean = false, onSelected?: () => void): void {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.visible = true;
        this.onUpgradeSelected = onSelected || null;

        // Get random upgrades
        const upgrades = this.getRandomUpgradesOfDifferentTypes(3, isBossWave);
        
        // Create and position upgrade cards
        const totalWidth = (UpgradeSystem.CARD_WIDTH * upgrades.length) + (UpgradeSystem.CARD_SPACING * (upgrades.length - 1));
        const startX = (this.dimensions.width - totalWidth) / 2;
        
        upgrades.forEach((upgrade, index) => {
            const card = this.createUpgradeCard(upgrade);
            card.x = startX + (UpgradeSystem.CARD_WIDTH + UpgradeSystem.CARD_SPACING) * index;
            card.y = (this.dimensions.height - UpgradeSystem.CARD_HEIGHT) / 2;
            this.addChild(card);
            this.cards.push(card);
            
            // Create particle effect
            const particleContainer = this.createParticleEffect(upgrade.rarity);
            particleContainer.x = card.x + UpgradeSystem.CARD_WIDTH / 2;
            particleContainer.y = card.y + UpgradeSystem.CARD_HEIGHT / 2;
            this.addChild(particleContainer);
            this.particleContainers.push(particleContainer);
        });
    }

    private getReplacementMessage(newUpgrade: Upgrade, existingUpgrade: Upgrade): string {
        if (newUpgrade.rarity === existingUpgrade.rarity) {
            return '(Replaces existing upgrade)';
        }
        return `(Replaces ${existingUpgrade.rarity} ${existingUpgrade.name})`;
    }

    private createUpgradeCard(upgrade: Upgrade): PIXI.Container {
        const card = new PIXI.Container();
        
        // Card background with rarity-based styling
        const background = new PIXI.Graphics();
        const rarityColor = UpgradeSystem.RARITY_COLORS[upgrade.rarity];
        
        // Outer glow
        background.lineStyle(4, rarityColor, 0.8);
        background.beginFill(0x222222, 0.9);
        background.drawRoundedRect(0, 0, UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT, 15);
        background.endFill();
        
        // Inner border
        background.lineStyle(2, rarityColor, 0.6);
        background.drawRoundedRect(5, 5, UpgradeSystem.CARD_WIDTH - 10, UpgradeSystem.CARD_HEIGHT - 10, 12);
        
        card.addChild(background);
        
        // Rarity text
        const rarityText = new PIXI.Text(upgrade.rarity.toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: rarityColor,
            fontWeight: 'bold'
        });
        rarityText.x = (UpgradeSystem.CARD_WIDTH - rarityText.width) / 2;
        rarityText.y = 20;
        card.addChild(rarityText);
        
        // Upgrade name with rarity-based styling
        const nameText = new PIXI.Text(upgrade.name, {
            fontFamily: 'Arial',
            fontSize: 28,
            fill: rarityColor,
            align: 'center',
            fontWeight: 'bold',
            wordWrap: true,
            wordWrapWidth: UpgradeSystem.CARD_WIDTH - 40
        });
        nameText.x = (UpgradeSystem.CARD_WIDTH - nameText.width) / 2;
        nameText.y = 50;
        card.addChild(nameText);
        
        // Add replacement message if applicable
        const existingUpgrade = this.chosenUpgrades.get(upgrade.type);
        let description = upgrade.description;
        if (existingUpgrade && !upgrade.isHealing) {
            description += '\n\n' + this.getReplacementMessage(upgrade, existingUpgrade);
        }
        
        // Upgrade description
        const descText = new PIXI.Text(description, {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xffffff,
            align: 'center',
            wordWrap: true,
            wordWrapWidth: UpgradeSystem.CARD_WIDTH - 40
        });
        descText.x = (UpgradeSystem.CARD_WIDTH - descText.width) / 2;
        descText.y = 120;
        card.addChild(descText);
        
        // Make card interactive
        background.interactive = true;
        background.cursor = 'pointer';
        
        // Hover effects
        background.on('mouseover', () => {
            card.scale.set(1.05);
            background.tint = 0xdddddd;
        });
        
        background.on('mouseout', () => {
            card.scale.set(1);
            background.tint = 0xffffff;
        });
        
        background.on('click', () => {
            this.selectUpgrade(upgrade);
        });
        
        return card;
    }

    private getRandomUpgradesOfDifferentTypes(count: number, isBossWave: boolean = false): Upgrade[] {
        const upgradesByType = new Map<UpgradeType, Upgrade[]>();
        
        // Group upgrades by type
        this.upgrades.forEach(upgrade => {
            if (!upgrade.isHealing) { // Don't group healing upgrades
                if (!upgradesByType.has(upgrade.type)) {
                    upgradesByType.set(upgrade.type, []);
                }
                upgradesByType.get(upgrade.type)!.push(upgrade);
            }
        });
        
        const types = Array.from(upgradesByType.keys());
        const selectedTypes = new Set<UpgradeType>();
        const selected: Upgrade[] = [];
        
        while (selected.length < count && types.length > 0) {
            const typeIndex = Math.floor(Math.random() * types.length);
            const type = types[typeIndex];
            
            if (!selectedTypes.has(type)) {
                selectedTypes.add(type);
                
                let upgrade = this.selectValidUpgrade(upgradesByType.get(type)!, isBossWave);
                let attempts = 0;
                
                // If we can't find a valid upgrade after several attempts, offer healing
                if (!upgrade && attempts >= UpgradeSystem.MAX_REROLL_ATTEMPTS) {
                    upgrade = this.upgrades.find(u => u.isHealing);
                }
                
                if (upgrade) {
                    selected.push(upgrade);
                }
            }
            
            types.splice(typeIndex, 1);
        }
        
        return selected;
    }

    private selectValidUpgrade(upgrades: Upgrade[], isBossWave: boolean): Upgrade | undefined {
        let attempts = 0;
        while (attempts < UpgradeSystem.MAX_REROLL_ATTEMPTS) {
            const upgrade = this.selectUpgradeByRarityWeight(upgrades, isBossWave);
            const existingUpgrade = this.chosenUpgrades.get(upgrade.type);
            
            // For boss waves, only accept epic or legendary upgrades
            if (isBossWave && upgrade.rarity < UpgradeRarity.EPIC) {
                attempts++;
                continue;
            }
            
            // Accept if no existing upgrade or higher rarity
            if (!existingUpgrade || upgrade.rarity > existingUpgrade.rarity) {
                return upgrade;
            }
            
            attempts++;
        }
        return undefined;
    }

    private selectUpgradeByRarityWeight(upgrades: Upgrade[], isBossWave: boolean): Upgrade {
        const weights = isBossWave ? UpgradeSystem.BOSS_RARITY_WEIGHTS : UpgradeSystem.RARITY_WEIGHTS;
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        // Filter upgrades based on boss wave requirements
        const validUpgrades = isBossWave 
            ? upgrades.filter(u => u.rarity >= UpgradeRarity.EPIC)
            : upgrades;
        
        if (validUpgrades.length === 0) {
            return upgrades[0]; // Fallback to first upgrade if no valid ones found
        }
        
        for (const upgrade of validUpgrades) {
            const weight = weights[upgrade.rarity];
            if (random <= weight) {
                return upgrade;
            }
            random -= weight;
        }
        
        return validUpgrades[0]; // Fallback to first valid upgrade
    }

    private selectUpgrade(upgrade: Upgrade): void {
        upgrade.apply(this.player);
        
        // Only track non-healing upgrades
        if (!upgrade.isHealing) {
            this.chosenUpgrades.set(upgrade.type, upgrade);
        }
        
        this.soundManager.playPowerUpSound();
        this.hideUpgradeSelection();

        // Call the callback if it exists
        if (this.onUpgradeSelected) {
            this.onUpgradeSelected();
            this.onUpgradeSelected = null;
        }
    }

    private hideUpgradeSelection(): void {
        this.visible = false;
        this.isVisible = false;
        
        // Clean up particle effects
        this.particleContainers.forEach(container => container.destroy());
        this.particleContainers = [];
    }

    public isUpgradeScreenVisible(): boolean {
        return this.isVisible;
    }
} 