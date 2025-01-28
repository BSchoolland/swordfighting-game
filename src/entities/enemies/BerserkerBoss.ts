import * as PIXI from 'pixi.js';
import { Player } from '../Player';
import { BossEnemy } from './BossEnemy';
import { Entity } from '../Entity';
import { BerserkerSword } from '../weapons/BerserkerSword';

export class BerserkerBoss extends BossEnemy {
    private static readonly STATS = {
        health: 400,
        speed: 0.5,
        maxSpeed: 2.75,
        chaseRange: 500,
        color: 0xff4400,
        movementRestriction: 0.7,
        windupRestriction: 0.6,
        chaseDuration: 4000,
        knockbackResistance: 0.6,
        maxRotateSpeed: 3.0
    };

    private baseSpeed: number;
    private baseMaxSpeed: number;
    private static readonly RAGE_THRESHOLD = 0.7; // 40% health
    private static readonly RAGE_SPEED_MULTIPLIER = 2;
    private isEnraged: boolean = false;
    private rageTransitionTime: number = 0;
    private static readonly RAGE_TRANSITION_DURATION = 1000; // 1 second transition
    private rageGlow: PIXI.Graphics;
    private rageLines: PIXI.Graphics;
    private pulseTime: number = 0;

    constructor(bounds: { width: number; height: number }, player: Player) {
        super(bounds, player, BerserkerBoss.STATS, "The Berserker");
        this.baseSpeed = this.stats.speed;
        this.baseMaxSpeed = this.stats.maxSpeed;

        // Initialize rage effects
        this.rageGlow = new PIXI.Graphics();
        this.rageLines = new PIXI.Graphics();
        this.addChild(this.rageGlow);
        this.addChild(this.rageLines);
    }

    protected initializeWeapon(): void {
        this.weapon = new BerserkerSword(this, true);
        this.addChild(this.weapon);
    }

    protected drawSprite(): void {
        this.sprite.clear();
        
        // Jagged, aggressive triangle for the berserker
        this.sprite.beginFill(this.stats.color);
        this.sprite.moveTo(-15, -15);
        this.sprite.lineTo(5, -5);
        this.sprite.lineTo(20, 0);
        this.sprite.lineTo(5, 5);
        this.sprite.lineTo(-15, 15);
        this.sprite.lineTo(-10, 0);
        this.sprite.lineTo(-15, -15);
        this.sprite.endFill();

        // Add some rage details
        this.sprite.lineStyle(2, 0xff2200);
        this.sprite.moveTo(-10, -8);
        this.sprite.lineTo(0, -8);
        this.sprite.moveTo(-10, 8);
        this.sprite.lineTo(0, 8);
    }

    public takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number): void {
        // Apply knockback resistance
        const reducedKnockback = knockbackForce * (1 - this.stats.knockbackResistance!);
        super.takeDamage(amount, knockbackDir, reducedKnockback);
    }

    private drawRageEffects(rageIntensity: number): void {
        // Clear previous effects
        this.rageGlow.clear();
        this.rageLines.clear();

        if (rageIntensity > 0) {
            // Draw pulsing glow
            const glowAlpha = 0.3 * rageIntensity;
            this.rageGlow.beginFill(0xff0000, glowAlpha);
            this.rageGlow.drawCircle(0, 0, 25 + Math.sin(this.pulseTime * 0.01) * 5);
            this.rageGlow.endFill();

            // Draw rage lines
            const lineIntensity = rageIntensity * (0.7 + Math.sin(this.pulseTime * 0.01) * 0.3);
            this.rageLines.lineStyle(2, 0xff0000, lineIntensity);
            
            // Draw radiating lines
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const length = 20 + Math.sin(this.pulseTime * 0.01 + i) * 5;
                const x = Math.cos(angle) * length;
                const y = Math.sin(angle) * length;
                this.rageLines.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
                this.rageLines.lineTo(x, y);
            }
        }
    }

    public update(delta: number, targets: Entity[] = []): void {
        super.update(delta, targets);

        if (!this.stunned) {
            const healthRatio = this.health / 400;
            const shouldBeEnraged = healthRatio <= BerserkerBoss.RAGE_THRESHOLD;

            // Handle rage transition
            if (shouldBeEnraged !== this.isEnraged) {
                this.isEnraged = shouldBeEnraged;
                this.rageTransitionTime = 0;
            }

            // Update rage transition
            if (this.rageTransitionTime < BerserkerBoss.RAGE_TRANSITION_DURATION) {
                this.rageTransitionTime += delta * 1000;
            }

            // Calculate rage intensity for visual effects
            let rageIntensity = 0;
            if (this.isEnraged) {
                rageIntensity = Math.min(1, this.rageTransitionTime / BerserkerBoss.RAGE_TRANSITION_DURATION);
            } else {
                rageIntensity = Math.max(0, 1 - (this.rageTransitionTime / BerserkerBoss.RAGE_TRANSITION_DURATION));
            }

            // Update pulse time for animations
            this.pulseTime += delta * 1000;

            // Update visual effects
            this.drawRageEffects(rageIntensity);

            // Update stats based on rage
            if (this.isEnraged) {
                this.stats.speed = this.baseSpeed * BerserkerBoss.RAGE_SPEED_MULTIPLIER;
                this.stats.maxSpeed = this.baseMaxSpeed * BerserkerBoss.RAGE_SPEED_MULTIPLIER;
                
                // Attack more aggressively in rage mode
                const distance = this.distanceToPlayer();
                if (distance < this.attackRange * 2) {
                    this.weapon.swing();
                }
            } else {
                // Normal behavior
                this.stats.speed = this.baseSpeed;
                this.stats.maxSpeed = this.baseMaxSpeed;
                
                const distance = this.distanceToPlayer();
                if (distance < this.attackRange * 1.2) {
                    this.weapon.swing();
                }
            }
        }
    }
} 