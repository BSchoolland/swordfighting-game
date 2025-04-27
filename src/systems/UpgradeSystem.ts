import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player';
import { SoundManager } from './SoundManager';
import { InputManager } from './InputManager';

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
    private static readonly CARD_WIDTH = 216;
    private static readonly CARD_HEIGHT = 300;
    private static readonly CARD_SPACING = 40;
    private static readonly SCREEN_MARGIN = 50; // Margin from screen edges
    private static readonly BACKGROUND_ALPHA = 0.5;
    
    private static readonly RARITY_COLORS = {
        [UpgradeRarity.COMMON]: 0x666666,
        [UpgradeRarity.RARE]: 0x0088ff,
        [UpgradeRarity.EPIC]: 0xaa00ff,
        [UpgradeRarity.LEGENDARY]: 0xffaa00
    };

    private static readonly RARITY_WEIGHTS = {
        [UpgradeRarity.COMMON]: 65,
        [UpgradeRarity.RARE]: 23,
        [UpgradeRarity.EPIC]: 11,
        [UpgradeRarity.LEGENDARY]: 1
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
    private onUpgradeSelected: (() => void) | null = null;
    
    // Gamepad navigation properties
    private inputManager: InputManager;
    private currentSelectedIndex: number = 0;
    private gamepadCursor: PIXI.Graphics | null = null;
    private lastInputTime: number = 0;
    private readonly INPUT_DEBOUNCE_TIME = 200; // ms
    private displayedUpgrades: Upgrade[] = [];

    constructor(dimensions: { width: number; height: number }, player: Player, inputManager: InputManager) {
        super();
        this.dimensions = dimensions;
        this.player = player;
        this.soundManager = SoundManager.getInstance();
        this.lastCheckedLevel = player.getLevel();
        this.inputManager = inputManager;
        
        this.initializeUpgrades();
        
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000, UpgradeSystem.BACKGROUND_ALPHA);
        this.background.drawRect(0, 0, dimensions.width, dimensions.height);
        this.background.endFill();
        this.addChild(this.background);
        
        // Create gamepad selection cursor (initially invisible)
        this.gamepadCursor = new PIXI.Graphics();
        this.gamepadCursor.visible = false;
        this.addChild(this.gamepadCursor);
        
        this.visible = false;
    }

    private initializeUpgrades(): void {
        const healingUpgrade: Upgrade = {
            id: 'healing',
            name: 'Divine Healing',
            description: 'Restore 50 health points',
            rarity: UpgradeRarity.EPIC,
            type: UpgradeType.MAX_HEALTH,
            apply: (player: Player) => player.heal(50),
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
                description: 'Reduce dash cooldown by 20%',
                rarity: UpgradeRarity.COMMON,
                type: UpgradeType.DASH,
                apply: (player: Player) => player.reduceDashCooldown(0.20)
            },
            {
                id: 'dash_rare',
                name: 'Swift Recovery',
                description: 'Reduce dash cooldown by 30%',
                rarity: UpgradeRarity.RARE,
                type: UpgradeType.DASH,
                apply: (player: Player) => player.reduceDashCooldown(0.3)
            },
            {
                id: 'dash_epic',
                name: 'Shadow Step',
                description: 'Reduce dash cooldown by 40%',
                rarity: UpgradeRarity.EPIC,
                type: UpgradeType.DASH,
                apply: (player: Player) => player.reduceDashCooldown(0.40)
            },
            {
                id: 'dash_legendary',
                name: 'Time Weaver',
                description: 'Reduce dash cooldown by 50%',
                rarity: UpgradeRarity.LEGENDARY,
                type: UpgradeType.DASH,
                apply: (player: Player) => player.reduceDashCooldown(0.5)
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
                description: 'Increase attack speed by 10%',
                rarity: UpgradeRarity.COMMON,
                type: UpgradeType.SWING_SPEED,
                apply: (player: Player) => player.increaseSwingSpeed(0.1)
            },
            {
                id: 'swing_rare',
                name: 'Swift Blade',
                description: 'Increase attack speed by 20%',
                rarity: UpgradeRarity.RARE,
                type: UpgradeType.SWING_SPEED,
                apply: (player: Player) => player.increaseSwingSpeed(0.2)
            },
            {
                id: 'swing_epic',
                name: 'Blade Dance',
                description: 'Increase attack speed by 30%',
                rarity: UpgradeRarity.EPIC,
                type: UpgradeType.SWING_SPEED,
                apply: (player: Player) => player.increaseSwingSpeed(0.3)
            },
            {
                id: 'swing_legendary',
                name: 'Lightning Blade',
                description: 'Increase attack speed by 50%',
                rarity: UpgradeRarity.LEGENDARY,
                type: UpgradeType.SWING_SPEED,
                apply: (player: Player) => player.increaseSwingSpeed(0.5)
            },

            // Max Health Upgrades
            {
                id: 'health_common',
                name: 'Tough Skin',
                description: 'Increase max health by 15',
                rarity: UpgradeRarity.COMMON,
                type: UpgradeType.MAX_HEALTH,
                apply: (player: Player) => player.increaseMaxHealth(15)
            },
            {
                id: 'health_rare',
                name: 'Iron Body',
                description: 'Increase max health by 25',
                rarity: UpgradeRarity.RARE,
                type: UpgradeType.MAX_HEALTH,
                apply: (player: Player) => player.increaseMaxHealth(25)
            },
            {
                id: 'health_epic',
                name: 'Titan\'s Endurance',
                description: 'Increase max health by 50',
                rarity: UpgradeRarity.EPIC,
                type: UpgradeType.MAX_HEALTH,
                apply: (player: Player) => player.increaseMaxHealth(50)
            },
            {
                id: 'health_legendary',
                name: 'Immortal Vessel',
                description: 'Increase max health by 100',
                rarity: UpgradeRarity.LEGENDARY,
                type: UpgradeType.MAX_HEALTH,
                apply: (player: Player) => player.increaseMaxHealth(100)
            }
        ];

        // Add healing upgrade
        this.upgrades.push(healingUpgrade);
    }

    private createParticleEffect(rarity: UpgradeRarity): PIXI.Container {
        const container = new PIXI.Container();
        const color = UpgradeSystem.RARITY_COLORS[rarity];
        const particles: { sprite: PIXI.Graphics; speed: number; fadeSpeed: number }[] = [];
        
        const particleCount = rarity === UpgradeRarity.LEGENDARY ? 20 : 10;
    
        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(color);
    
            if (rarity === UpgradeRarity.LEGENDARY) {
                const points: number[] = [];
                const spikes = 5;
                const outerRadius = 4;
                const innerRadius = 2;
                
                for (let j = 0; j < spikes * 2; j++) {
                    const radius = j % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (j * Math.PI) / spikes;
                    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
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
    
            // Store particle with random properties
            particles.push({
                sprite: particle,
                speed: 0.5 + Math.random() * 0.5, // Move speed between 0.5 and 1
                fadeSpeed: 0.002 + Math.random() * 0.003, // Fade speed between 0.002 and 0.005
            });
        }
    
        // Single shared animation loop for all particles
        const animate = () => {
            for (const p of particles) {
                p.sprite.y -= p.speed;
                p.sprite.alpha -= p.fadeSpeed;
    
                if (p.sprite.alpha <= 0) {
                    // Reset position and properties randomly
                    p.sprite.x = Math.random() * UpgradeSystem.CARD_WIDTH;
                    p.sprite.y = UpgradeSystem.CARD_HEIGHT;
                    p.sprite.alpha = 0.6;
                    p.speed = 0.5 + Math.random() * 0.5;
                    p.fadeSpeed = 0.002 + Math.random() * 0.003;
                }
            }
    
            requestAnimationFrame(animate);
        };
    
        animate();
    
        return container;
    }
    

    public update(): void {
        // No longer automatically show upgrades during combat
        // Just track the level for internal state
        const currentLevel = this.player.getLevel();
        if (currentLevel > this.lastCheckedLevel) {
            this.lastCheckedLevel = currentLevel;
        }
        
        // Handle gamepad navigation when visible
        if (this.isVisible) {
            this.handleGamepadInput();
        }
    }

    public showUpgradeSelection(isBossWave: boolean = false, onSelected?: () => void): void {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.visible = true;
        this.onUpgradeSelected = onSelected || null;
        this.currentSelectedIndex = 0; // Reset selection index

        // Play upgrade sound
        this.soundManager.playUpgradeSound();

        // Get random upgrades
        this.displayedUpgrades = this.getRandomUpgradesOfDifferentTypes(3, isBossWave);
        
        // Create and position upgrade cards with screen margin
        const availableWidth = this.dimensions.width - (UpgradeSystem.SCREEN_MARGIN * 2);
        const totalWidth = (UpgradeSystem.CARD_WIDTH * this.displayedUpgrades.length) + (UpgradeSystem.CARD_SPACING * (this.displayedUpgrades.length - 1));
        
        // Center cards horizontally with margin
        const startX = Math.max(
            UpgradeSystem.SCREEN_MARGIN,
            (this.dimensions.width - totalWidth) / 2
        );
        
        // Ensure vertical margin as well
        const cardCenterY = Math.max(
            UpgradeSystem.CARD_HEIGHT / 2 + UpgradeSystem.SCREEN_MARGIN,
            (this.dimensions.height / 2) + 20
        );
        
        this.displayedUpgrades.forEach((upgrade, index) => {
            const card = this.createUpgradeCard(upgrade, index);
            // Since the card's pivot is now at its center, we need to position by the center point
            const cardCenterX = startX + (UpgradeSystem.CARD_WIDTH / 2) + (index * (UpgradeSystem.CARD_WIDTH + UpgradeSystem.CARD_SPACING));
            card.position.set(cardCenterX, cardCenterY);
            this.addChild(card);
            this.cards.push(card);
            
            // Create particle effect - also adjust to use the new center position
            const particleContainer = this.createParticleEffect(upgrade.rarity);
            particleContainer.x = cardCenterX;
            particleContainer.y = cardCenterY;
            this.addChild(particleContainer);
            this.particleContainers.push(particleContainer);
        });
        
        // Highlight the first card
        this.setSelectedCard(0);
    }

    private createUpgradeCard(upgrade: Upgrade, index: number): PIXI.Container {
        const card = new PIXI.Container();
        
        // Card background with modern sci-fi styling
        const background = new PIXI.Graphics();
        const rarityColor = UpgradeSystem.RARITY_COLORS[upgrade.rarity];
        
        // Dark background with subtle gradient
        background.beginFill(0x111111, 0.9);
        background.drawRoundedRect(0, 0, UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT, 8);
        background.endFill();
        
        // Sci-fi accent lines
        background.lineStyle(1, rarityColor, 0.7);
        
        // Top left corner tech lines
        background.moveTo(0, 25);
        background.lineTo(25, 0);
        
        // Bottom right corner tech lines
        background.moveTo(UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT - 25);
        background.lineTo(UpgradeSystem.CARD_WIDTH - 25, UpgradeSystem.CARD_HEIGHT);
        
        

        
        card.addChild(background);
        
        // Create glowing border effect
        const border = new PIXI.Graphics();
        border.lineStyle(2, rarityColor, 0.8);
        border.drawRoundedRect(0, 0, UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT, 8);
        card.addChild(border);
        
        // Create container for card content to keep it separate from scan line
        const contentContainer = new PIXI.Container();
        contentContainer.position.set(0, 0);
        card.addChild(contentContainer);
        
        // Rarity indicator - minimal dot pattern
        const rarityIndicator = new PIXI.Graphics();
        rarityIndicator.beginFill(rarityColor, 0.9);
        
        // Number of dots based on rarity
        const dotCount = {
            [UpgradeRarity.COMMON]: 1,
            [UpgradeRarity.RARE]: 2,
            [UpgradeRarity.EPIC]: 3,
            [UpgradeRarity.LEGENDARY]: 4
        }[upgrade.rarity];
        
        // Draw dots
        const dotSize = 4;
        const dotSpacing = 10;
        const totalWidth = (dotCount * dotSize) + ((dotCount - 1) * dotSpacing);
        const startX = (UpgradeSystem.CARD_WIDTH - totalWidth) / 2;
        
        for (let i = 0; i < dotCount; i++) {
            rarityIndicator.drawCircle(
                startX + (i * (dotSize + dotSpacing)) + dotSize/2,
                30,
                dotSize
            );
        }
        rarityIndicator.endFill();
        contentContainer.addChild(rarityIndicator);
        
        // Upgrade name with modern sci-fi font styling
        const nameText = new PIXI.Text(upgrade.name.toUpperCase(), {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 22,
            fill: 0xffffff,
            align: 'center',
            fontWeight: 'bold',
            letterSpacing: 1,
            stroke: rarityColor,
            strokeThickness: 1,
            wordWrap: true,
            wordWrapWidth: UpgradeSystem.CARD_WIDTH - 40
        });
        nameText.x = (UpgradeSystem.CARD_WIDTH - nameText.width) / 2;
        nameText.y = 55;
        contentContainer.addChild(nameText);

        // After adding nameText

        // Horizontal accent line (moved dynamically below the title)
        const underlineY = nameText.y + nameText.height + 10; // 10 pixels below title
        background.lineStyle(2, rarityColor, 0.8);
        background.moveTo(20, underlineY);
        background.lineTo(UpgradeSystem.CARD_WIDTH - 20, underlineY);
        
        // Upgrade description
        const descText = new PIXI.Text(upgrade.description, {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 18,
            fill: 0xcccccc,
            align: 'center',
            letterSpacing: 0.5,
            wordWrap: true,
            wordWrapWidth: UpgradeSystem.CARD_WIDTH - 40
        });
        descText.x = (UpgradeSystem.CARD_WIDTH - descText.width) / 2;
        descText.y = 120;
        contentContainer.addChild(descText);
        
        // Type label - small, minimalist tech-looking tag
        const typeText = new PIXI.Text(upgrade.type.toUpperCase(), {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 12,
            fill: rarityColor,
            align: 'center',
            fontWeight: 'bold',
            letterSpacing: 2
        });
        typeText.x = (UpgradeSystem.CARD_WIDTH - typeText.width) / 2;
        typeText.y = UpgradeSystem.CARD_HEIGHT - 40;
        contentContainer.addChild(typeText);
        
        // Create a scan line overlay container (this will be on top of content)
        const scanLineContainer = new PIXI.Container();
        scanLineContainer.position.set(0, 0);
        
        // Tech scan line animation on hover
        const scanLine = new PIXI.Graphics();
        scanLine.beginFill(rarityColor, 0.3);
        scanLine.drawRect(0, 0, UpgradeSystem.CARD_WIDTH, 2);
        scanLine.endFill();
        scanLine.y = -10; // Start off-screen
        scanLine.visible = false;
        scanLineContainer.addChild(scanLine);
        
        // Add scanline container to card
        card.addChild(scanLineContainer);
        
        // Make card interactive with sci-fi hover effects
        background.interactive = true;
        background.cursor = 'pointer';
        
        // Set pivot point to the center of the card for proper scaling from center
        card.pivot.set(UpgradeSystem.CARD_WIDTH / 2, UpgradeSystem.CARD_HEIGHT / 2);
        card.position.set(UpgradeSystem.CARD_WIDTH / 2, UpgradeSystem.CARD_HEIGHT / 2);
        
        // Hover effects
        background.on('mouseover', () => {
            this.setSelectedCard(index);
            card.scale.set(1.05);
            border.clear();
            border.lineStyle(2, rarityColor, 1);
            border.drawRoundedRect(0, 0, UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT, 8);
            
            // Show and animate scan line - reference from scanLineContainer
            const scanLine = scanLineContainer.getChildAt(0) as PIXI.Graphics;
            scanLine.visible = true;
            let scanPos = 0;
            const animateScanLine = () => {
                if (!scanLine.visible) return;
                
                scanLine.y = scanPos;
                scanPos += 5;
                
                if (scanPos > UpgradeSystem.CARD_HEIGHT) {
                    scanPos = -2;
                }
                
                requestAnimationFrame(animateScanLine);
            };
            animateScanLine();
        });
        
        background.on('mouseout', () => {
            if (this.currentSelectedIndex !== index) {
                card.scale.set(1);
                border.clear();
                border.lineStyle(2, rarityColor, 0.8);
                border.drawRoundedRect(0, 0, UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT, 8);
                
                // Hide scan line - reference from scanLineContainer
                const scanLine = scanLineContainer.getChildAt(0) as PIXI.Graphics;
                scanLine.visible = false;
            }
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
                
                let upgrade = this.selectUpgradeByRarityWeight(upgradesByType.get(type)!, isBossWave);

                if (upgrade) {
                    selected.push(upgrade);
                }
            }
            
            types.splice(typeIndex, 1);
        }
        
        return selected;
    }

    private selectUpgradeByRarityWeight(upgrades: Upgrade[], isBossWave: boolean): Upgrade {
        const weights = UpgradeSystem.RARITY_WEIGHTS;
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        // Filter upgrades based on boss wave requirements
        const validUpgrades = isBossWave 
            ? upgrades.filter(u => u.rarity >= UpgradeRarity.EPIC)
            : upgrades;
        
        if (validUpgrades.length === 0) {
            return upgrades[0]; // Fallback to first upgrade if no valid ones found
        }
        
        // Group upgrades by rarity
        const byRarity = new Map<UpgradeRarity, Upgrade[]>();
        for (const upgrade of validUpgrades) {
            if (!byRarity.has(upgrade.rarity)) {
                byRarity.set(upgrade.rarity, []);
            }
            byRarity.get(upgrade.rarity)!.push(upgrade);
        }
        
        // Use the rarity weights to select a rarity first
        let cumulativeWeight = 0;
        for (const rarity of [UpgradeRarity.COMMON, UpgradeRarity.RARE, UpgradeRarity.EPIC, UpgradeRarity.LEGENDARY]) {
            if (byRarity.has(rarity)) {
                cumulativeWeight += weights[rarity];
                if (random <= cumulativeWeight) {
                    // Select a random upgrade of this rarity
                    const rarityUpgrades = byRarity.get(rarity)!;
                    return rarityUpgrades[Math.floor(Math.random() * rarityUpgrades.length)];
                }
            }
        }
        
        // If we get here, just pick the first valid upgrade
        return validUpgrades[0];
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
        
        if (this.gamepadCursor) {
            this.gamepadCursor.visible = false;
        }

        // clean up cards
        this.cards.forEach(card => card.destroy());
        this.cards = [];
        
        // Clean up particle effects
        this.particleContainers.forEach(container => container.destroy());
        this.particleContainers = [];
        
        // Clear displayed upgrades
        this.displayedUpgrades = [];
    }

    public isUpgradeScreenVisible(): boolean {
        return this.isVisible;
    }

    private setSelectedCard(index: number): void {
        if (index < 0 || index >= this.cards.length) return;
        
        // Reset previous selection
        if (this.currentSelectedIndex !== index && this.currentSelectedIndex < this.cards.length) {
            const prevCard = this.cards[this.currentSelectedIndex];
            prevCard.scale.set(1);
            
            // Reset border
            if (prevCard.getChildAt(1) instanceof PIXI.Graphics) {
                const prevBorder = prevCard.getChildAt(1) as PIXI.Graphics;
                const prevRarityColor = UpgradeSystem.RARITY_COLORS[this.displayedUpgrades[this.currentSelectedIndex].rarity];
                prevBorder.clear();
                prevBorder.lineStyle(2, prevRarityColor, 0.8);
                prevBorder.drawRoundedRect(0, 0, UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT, 8);
            }
            
            // Hide scan line
            const scanLineContainer = prevCard.getChildAt(3) as PIXI.Container;
            const prevScanLine = scanLineContainer.getChildAt(0) as PIXI.Graphics;
            prevScanLine.visible = false;
        }
        
        // Play sound feedback when selection changes (for both mouse and gamepad)
        if (this.currentSelectedIndex !== index) {
            this.soundManager.playMenuSound();
        }
        
        // Update current index
        this.currentSelectedIndex = index;
        
        // Apply selection effects
        const card = this.cards[index];
        const upgrade = this.displayedUpgrades[index];
        const rarityColor = UpgradeSystem.RARITY_COLORS[upgrade.rarity];
        
        card.scale.set(1.05);
        
        // Update border
        if (card.getChildAt(1) instanceof PIXI.Graphics) {
            const border = card.getChildAt(1) as PIXI.Graphics;
            border.clear();
            border.lineStyle(2, rarityColor, 1);
            border.drawRoundedRect(0, 0, UpgradeSystem.CARD_WIDTH, UpgradeSystem.CARD_HEIGHT, 8);
        }
        
        // Show scan line - get the scan line from the scanLineContainer
        const scanLineContainer = card.getChildAt(3) as PIXI.Container;
        const scanLine = scanLineContainer.getChildAt(0) as PIXI.Graphics;
        scanLine.visible = true;
        let scanPos = 0;
        const animateScanLine = () => {
            if (!scanLine.visible) return;
            
            scanLine.y = scanPos;
            scanPos += 5;
            
            if (scanPos > UpgradeSystem.CARD_HEIGHT) {
                scanPos = -2;
            }
            
            requestAnimationFrame(animateScanLine);
        };
        animateScanLine();
        
        // Update gamepad cursor position
        if (this.gamepadCursor && this.inputManager.isUsingGamepad()) {
            this.gamepadCursor.visible = true;
            this.gamepadCursor.position.set(card.position.x, card.position.y);
            
            // Recreate the cursor with the right size and color
            this.gamepadCursor.clear();
            this.gamepadCursor.lineStyle(3, rarityColor, 0.8);
            this.gamepadCursor.drawRoundedRect(
                -UpgradeSystem.CARD_WIDTH / 2 - 5, 
                -UpgradeSystem.CARD_HEIGHT / 2 - 5, 
                UpgradeSystem.CARD_WIDTH + 10, 
                UpgradeSystem.CARD_HEIGHT + 10, 
                12
            );
        }
    }
    
    private handleGamepadInput(): void {
        const now = Date.now();
        if (now - this.lastInputTime < this.INPUT_DEBOUNCE_TIME) return;
        
        // Check for gamepad input
        if (!this.inputManager.isUsingGamepad()) return;
        
        // Handle directional navigation
        if (this.inputManager.isMenuLeftTriggered()) {
            this.navigateCards('left');
            this.lastInputTime = now;
        } else if (this.inputManager.isMenuRightTriggered()) {
            this.navigateCards('right');
            this.lastInputTime = now;
        }
        
        // Handle selection with A button
        if (this.inputManager.isPrimaryActionJustPressed()) {
            this.selectCurrentCard();
        }
    }
    
    private navigateCards(direction: 'left' | 'right'): void {
        let newIndex = this.currentSelectedIndex;
        
        if (direction === 'left') {
            newIndex = Math.max(0, newIndex - 1);
        } else if (direction === 'right') {
            newIndex = Math.min(this.cards.length - 1, newIndex + 1);
        }
        
        if (newIndex !== this.currentSelectedIndex) {
            this.setSelectedCard(newIndex);
            // Sound is now played directly in setSelectedCard when index changes
        }
    }
    
    private selectCurrentCard(): void {
        if (this.currentSelectedIndex < this.displayedUpgrades.length) {
            const upgrade = this.displayedUpgrades[this.currentSelectedIndex];
            this.selectUpgrade(upgrade);
        }
    }
} 