import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { SoundManager } from './SoundManager';
import { BasicSword } from '../entities/weapons/BasicSword';

export interface Upgrade {
    id: string;
    name: string;
    description: string;
    apply: (player: Player) => void;
}

export class UpgradeSystem extends PIXI.Container {
    private static readonly CARD_WIDTH = 200;
    private static readonly CARD_HEIGHT = 300;
    private static readonly CARD_SPACING = 40;
    private static readonly BACKGROUND_ALPHA = 0.8;
    
    private upgrades: Upgrade[] = [];
    private player: Player;
    private dimensions: { width: number; height: number };
    private isVisible: boolean = false;
    private soundManager: SoundManager;
    private background: PIXI.Graphics;
    private cards: PIXI.Container[] = [];

    constructor(dimensions: { width: number; height: number }, player: Player) {
        super();
        this.dimensions = dimensions;
        this.player = player;
        this.soundManager = SoundManager.getInstance();
        
        // Initialize available upgrades
        this.initializeUpgrades();
        
        // Create semi-transparent background
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000, UpgradeSystem.BACKGROUND_ALPHA);
        this.background.drawRect(0, 0, dimensions.width, dimensions.height);
        this.background.endFill();
        this.addChild(this.background);
        
        // Hide initially
        this.visible = false;
    }

    private initializeUpgrades(): void {
        // Add all possible upgrades here
        this.upgrades = [
            {
                id: 'speed_1',
                name: 'Swift Feet',
                description: 'Increase movement speed by 20%',
                apply: (player: Player) => {
                    player.increaseSpeed(0.2);
                }
            },
            {
                id: 'speed_2',
                name: 'Fleet Foot',
                description: 'Increase movement speed by 30%',
                apply: (player: Player) => {
                    player.increaseSpeed(0.3);
                }
            },
            {
                id: 'speed_3',
                name: 'Lightning Legs',
                description: 'Increase movement speed by 40%',
                apply: (player: Player) => {
                    player.increaseSpeed(0.4);
                }
            },
            {
                id: 'dash_cooldown_1',
                name: 'Quick Recovery',
                description: 'Reduce dash cooldown by 15%',
                apply: (player: Player) => {
                    player.getDash().reduceCooldown(0.15);
                }
            },
            {
                id: 'dash_cooldown_2',
                name: 'Swift Recovery',
                description: 'Reduce dash cooldown by 30%',
                apply: (player: Player) => {
                    player.getDash().reduceCooldown(0.3);
                }
            },
            {
                id: 'dash_cooldown_3',
                name: 'Master Recovery',
                description: 'Reduce dash cooldown by 50%',
                apply: (player: Player) => {
                    player.getDash().reduceCooldown(0.5);
                }
            },
            {
                id: 'sword_reach_1',
                name: 'Extended Reach',
                description: 'Increase sword length by 5%',
                apply: (player: Player) => {
                    player.increaseSwordLength(0.05);
                }
            },
            {
                id: 'sword_reach_2',
                name: 'Long Reach',
                description: 'Increase sword length by 10%',
                apply: (player: Player) => {
                    player.increaseSwordLength(0.1);
                }
            },
            {
                id: 'sword_reach_3',
                name: 'Master\'s Reach',
                description: 'Increase sword length by 20%',
                apply: (player: Player) => {
                    player.increaseSwordLength(0.15);
                }
            }
        ];
    }

    public showUpgradeSelection(): void {
        this.visible = true;
        this.isVisible = true;
        
        // Clear existing cards
        this.cards.forEach(card => card.destroy());
        this.cards = [];

        // Get three random upgrades
        const selectedUpgrades = this.getRandomUpgrades(3);
        
        // Calculate starting X position to center the cards
        const totalWidth = (UpgradeSystem.CARD_WIDTH * 3) + (UpgradeSystem.CARD_SPACING * 2);
        let startX = (this.dimensions.width - totalWidth) / 2;
        
        // Create a card for each upgrade
        selectedUpgrades.forEach((upgrade, index) => {
            const card = this.createUpgradeCard(upgrade);
            card.x = startX + (UpgradeSystem.CARD_WIDTH + UpgradeSystem.CARD_SPACING) * index;
            card.y = (this.dimensions.height - UpgradeSystem.CARD_HEIGHT) / 2;
            this.addChild(card);
            this.cards.push(card);
        });
    }

    private createUpgradeCard(upgrade: Upgrade): PIXI.Container {
        const card = new PIXI.Container();
        
        // Card background
        const background = new PIXI.Graphics();
        background.lineStyle(2, 0xffffff);
        background.beginFill(0x333333);
        background.drawRoundedRect(0, 0, UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT, 10);
        background.endFill();
        card.addChild(background);
        
        // Upgrade name
        const nameText = new PIXI.Text(upgrade.name, {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
            align: 'center',
            wordWrap: true,
            wordWrapWidth: UpgradeSystem.CARD_WIDTH - 20
        });
        nameText.x = (UpgradeSystem.CARD_WIDTH - nameText.width) / 2;
        nameText.y = 20;
        card.addChild(nameText);
        
        // Upgrade description
        const descText = new PIXI.Text(upgrade.description, {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xcccccc,
            align: 'center',
            wordWrap: true,
            wordWrapWidth: UpgradeSystem.CARD_WIDTH - 40
        });
        descText.x = (UpgradeSystem.CARD_WIDTH - descText.width) / 2;
        descText.y = 80;
        card.addChild(descText);
        
        // Make card interactive
        background.interactive = true;
        background.cursor = 'pointer';
        
        // Hover effects
        background.on('mouseover', () => {
            background.tint = 0x666666;
        });
        
        background.on('mouseout', () => {
            background.tint = 0xffffff;
        });
        
        // Click handler
        background.on('click', () => {
            this.selectUpgrade(upgrade);
        });
        
        return card;
    }

    private selectUpgrade(upgrade: Upgrade): void {
        // Apply the upgrade
        upgrade.apply(this.player);
        
        // Play sound
        this.soundManager.playPowerUpSound();
        
        // Hide the upgrade selection
        this.hideUpgradeSelection();
    }

    private hideUpgradeSelection(): void {
        this.visible = false;
        this.isVisible = false;
    }

    private getRandomUpgrades(count: number): Upgrade[] {
        const availableUpgrades = [...this.upgrades];
        const selected: Upgrade[] = [];
        
        for (let i = 0; i < count && availableUpgrades.length > 0; i++) {
            const index = Math.floor(Math.random() * availableUpgrades.length);
            selected.push(availableUpgrades.splice(index, 1)[0]);
        }
        
        return selected;
    }

    public isUpgradeScreenVisible(): boolean {
        return this.isVisible;
    }
} 