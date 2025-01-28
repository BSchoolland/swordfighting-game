import * as PIXI from 'pixi.js';
import { Entity } from '../Entity';
import { Bow } from './Bow';
import { Arrow } from '../projectiles/Arrow';

export class HunterBow extends Bow {
    private static readonly PLAYER_PARAMS = {
        attackSpeed: 1200,
        bladeLength: 40,
        projectileStats: {
            speed: 7,
            damage: 12,
            knockback: 8,
            size: 3,
            color: 0x00aa44,
            lifetime: 2000,
            maxRange: 400
        }
    };

    private static readonly ENEMY_PARAMS = {
        attackSpeed: 1500,
        windUpTime: 500,
        bladeLength: 40,
        projectileStats: {
            speed: 6,
            damage: 10,
            knockback: 6,
            size: 3,
            color: 0x00aa44,
            lifetime: 2000,
            maxRange: 400
        }
    };

    private static readonly SPREAD_ANGLE = Math.PI / 8; // 22.5 degrees spread
    private static readonly ARROWS_PER_SHOT = 5;

    constructor(owner: Entity, isEnemy: boolean = false) {
        super(owner, isEnemy);
    }

    protected getParams() {
        return this.isEnemy ? HunterBow.ENEMY_PARAMS : HunterBow.PLAYER_PARAMS;
    }

    protected createProjectile(startPos: { x: number; y: number; }, direction: { x: number; y: number; }): Arrow {
        const params = this.getParams();
        const baseAngle = Math.atan2(direction.y, direction.x);
        const spreadStep = (HunterBow.SPREAD_ANGLE * 2) / (HunterBow.ARROWS_PER_SHOT - 1);
        
        // Create and return the center arrow
        const centerArrow = new Arrow(
            this.owner.parent.getBounds(),
            this.owner,
            startPos,
            direction,
            this.isEnemy
        );
        
        // Get the game scene
        const gameScene = this.parent?.parent;
        if (gameScene && 'addProjectile' in gameScene) {
            // Create side arrows (skipping the center arrow index)
            for (let i = 0; i < HunterBow.ARROWS_PER_SHOT; i++) {
                if (i === Math.floor(HunterBow.ARROWS_PER_SHOT / 2)) continue; // Skip center arrow
                
                const angle = baseAngle - HunterBow.SPREAD_ANGLE + (spreadStep * i);
                const sideDirection = {
                    x: Math.cos(angle),
                    y: Math.sin(angle)
                };
                
                const arrow = new Arrow(
                    this.owner.parent.getBounds(),
                    this.owner,
                    startPos,
                    sideDirection,
                    this.isEnemy
                );
                
                // Add to game scene properly
                (gameScene as any).addProjectile(arrow);
            }
        }
        
        return centerArrow;
    }

    public draw(): void {
        this.graphics.clear();
        
        // Draw the bow body
        this.graphics.lineStyle(3, this.getParams().projectileStats.color);
        this.graphics.moveTo(-5, -20);
        this.graphics.quadraticCurveTo(15, 0, -5, 20);
        
        // Draw the bowstring
        this.graphics.lineStyle(1, 0xcccccc);
        this.graphics.moveTo(-5, -20);
        this.graphics.lineTo(-8, 0);
        this.graphics.lineTo(-5, 20);
        
        // Add decorative details
        this.graphics.lineStyle(2, 0x008833);
        this.graphics.moveTo(-5, -10);
        this.graphics.lineTo(5, -10);
        this.graphics.moveTo(-5, 10);
        this.graphics.lineTo(5, 10);
    }

    public drawPreview(): void {
        this.graphics.clear();
        this.graphics.lineStyle(3, this.getParams().projectileStats.color, 0.5);
        this.graphics.moveTo(-5, -20);
        this.graphics.quadraticCurveTo(15, 0, -5, 20);
    }
} 