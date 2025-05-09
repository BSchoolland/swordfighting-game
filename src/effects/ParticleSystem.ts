import * as PIXI from 'pixi.js';

interface Particle extends PIXI.Graphics {
    velocity: { x: number, y: number };
    lifetime: number;
    maxLifetime: number;
    alpha: number;
}

export class ParticleSystem {
    private static instance: ParticleSystem;
    private particles: Particle[] = [];
    private container: PIXI.Container;
    private trailContainer: PIXI.Container; // New container for trails to be rendered below other effects

    private constructor(container: PIXI.Container) {
        this.container = container;
        this.trailContainer = new PIXI.Container();
        container.addChildAt(this.trailContainer, 0); // Add at index 0 to render below other effects
    }

    public static getInstance(container?: PIXI.Container): ParticleSystem {
        if (!ParticleSystem.instance && container) {
            ParticleSystem.instance = new ParticleSystem(container);
        }
        return ParticleSystem.instance;
    }

    public createHitSparks(x: number, y: number, color: number = 0xFFFF00, direction: number = 0): void {
        const numParticles = 12;
        const spreadAngle = Math.PI / 2; // 90 degree spread
        
        for (let i = 0; i < numParticles; i++) {
            const particle = new PIXI.Graphics() as Particle;
            
            // Draw the spark (bigger and brighter)
            particle.beginFill(color);
            particle.drawCircle(0, 0, 1 + Math.random() * 2); 
            particle.endFill();
            
            // Position and physics (faster initial speed)
            particle.x = x;
            particle.y = y;
            const angle = direction + (Math.random() - 0.5) * spreadAngle;
            const speed = 1000 + Math.random() * 300; // Much faster initial speed
            particle.velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            
            // Shorter lifetime for snappier effect
            particle.maxLifetime = 100 + Math.random() * 50;
            particle.lifetime = particle.maxLifetime;
            particle.alpha = 1;

            this.particles.push(particle);
            this.container.addChild(particle);
        }

        // Create flash effect (bigger and brighter)
        const flash = new PIXI.Graphics();
        flash.beginFill(0xFFFFFF);
        flash.drawCircle(x, y, 35); // Bigger flash
        flash.endFill();
        flash.alpha = 0.4; 
        this.container.addChild(flash);

        // Fade out and remove flash
        const fadeOut = () => {
            flash.alpha -= 0.15; // Faster fade
            if (flash.alpha <= 0) {
                this.container.removeChild(flash);
            } else {
                requestAnimationFrame(fadeOut);
            }
        };
        fadeOut();
    }

    public createDeathEffect(x: number, y: number, color: number = 0xFF0000): void {
        const numParticles = 16;
        for (let i = 0; i < numParticles; i++) {
            const particle = new PIXI.Graphics() as Particle;
            
            // Draw the dissolve particle (bigger and brighter)
            particle.beginFill(color);
            particle.drawCircle(0, 0, 3 + Math.random() * 4);
            particle.endFill();
            
            // Position and physics (faster initial speed)
            particle.x = x + (Math.random() - 0.5) * 30;
            particle.y = y + (Math.random() - 0.5) * 30;
            const angle = Math.PI * 2 * Math.random();
            const speed = 500 + Math.random() * 200;
            particle.velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            
            // Shorter lifetime for snappier effect
            particle.maxLifetime = 500 + Math.random() * 80;
            particle.lifetime = particle.maxLifetime;
            particle.alpha = 1;

            this.particles.push(particle);
            this.container.addChild(particle);
        }
    }

    public createBossDeathEffect(x: number, y: number, color: number = 0xFF0000): void {
        // Create expanding ring
        const ring = new PIXI.Graphics();
        ring.lineStyle(3, color, 0.8);
        ring.drawCircle(x, y, 10);
        ring.alpha = 1;
        this.container.addChild(ring);

        // Animate the ring
        let ringRadius = 10;
        const expandRing = () => {
            ring.clear();
            ring.lineStyle(3, color, ring.alpha);
            ring.drawCircle(x, y, ringRadius);
            ringRadius += 5;
            ring.alpha -= 0.02;
            
            if (ring.alpha > 0) {
                requestAnimationFrame(expandRing);
            } else {
                this.container.removeChild(ring);
            }
        };
        expandRing();

        // Create multiple waves of particles
        const createParticleWave = (delay: number) => {
            setTimeout(() => {
                const numParticles = 24;
                for (let i = 0; i < numParticles; i++) {
                    const particle = new PIXI.Graphics() as Particle;
                    
                    // Larger, more dramatic particles
                    particle.beginFill(color);
                    particle.drawCircle(0, 0, 4 + Math.random() * 6);
                    particle.endFill();
                    
                    // Start from random position within the boss
                    const startRadius = 30;
                    const startAngle = (i / numParticles) * Math.PI * 2;
                    particle.x = x + Math.cos(startAngle) * startRadius * Math.random();
                    particle.y = y + Math.sin(startAngle) * startRadius * Math.random();
                    
                    // Explode outward
                    const speed = 300 + Math.random() * 400;
                    particle.velocity = {
                        x: Math.cos(startAngle) * speed,
                        y: Math.sin(startAngle) * speed
                    };
                    
                    // Longer lifetime for more dramatic effect
                    particle.maxLifetime = 800 + Math.random() * 200;
                    particle.lifetime = particle.maxLifetime;
                    particle.alpha = 1;

                    this.particles.push(particle);
                    this.container.addChild(particle);
                }
            }, delay);
        };

        // Create three waves of particles
        createParticleWave(0);    // Initial burst
        createParticleWave(200);  // Second wave
        createParticleWave(400);  // Final wave

        // Create flash effect
        const flash = new PIXI.Graphics();
        flash.beginFill(0xFFFFFF);
        flash.drawCircle(x, y, 100);
        flash.endFill();
        flash.alpha = 0.6;
        this.container.addChild(flash);

        // Fade out flash
        const fadeOutFlash = () => {
            flash.alpha -= 0.1;
            if (flash.alpha <= 0) {
                this.container.removeChild(flash);
            } else {
                requestAnimationFrame(fadeOutFlash);
            }
        };
        fadeOutFlash();
    }

    public createPlayerDeathEffect(x: number, y: number, color: number = 0x3498db): void {
        // Create multiple expanding rings
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const ring = new PIXI.Graphics();
                ring.lineStyle(4, color, 0.8);
                ring.drawCircle(x, y, 10);
                ring.alpha = 1;
                this.container.addChild(ring);

                // Animate the ring
                let ringRadius = 10;
                const expandRing = () => {
                    ring.clear();
                    ring.lineStyle(4, color, ring.alpha);
                    ring.drawCircle(x, y, ringRadius);
                    ringRadius += 5;
                    ring.alpha -= 0.02;
                    
                    if (ring.alpha > 0) {
                        requestAnimationFrame(expandRing);
                    } else {
                        this.container.removeChild(ring);
                    }
                };
                expandRing();
            }, i * 300); // Staggered timing
        }

        // Create shockwave effect
        const shockwave = new PIXI.Graphics();
        shockwave.lineStyle(6, 0xFFFFFF, 0.8);
        shockwave.drawCircle(x, y, 5);
        this.container.addChild(shockwave);

        let shockwaveRadius = 5;
        const animateShockwave = () => {
            shockwave.clear();
            shockwave.lineStyle(6, 0xFFFFFF, shockwave.alpha);
            shockwave.drawCircle(x, y, shockwaveRadius);
            shockwaveRadius += 10;
            shockwave.alpha -= 0.05;
            
            if (shockwave.alpha > 0) {
                requestAnimationFrame(animateShockwave);
            } else {
                this.container.removeChild(shockwave);
            }
        };
        animateShockwave();

        // Create multiple waves of particles with different colors
        const colors = [color, 0xFFFFFF, 0xFFD700]; // Player color, white, gold
        const createParticleWave = (delay: number, waveColor: number) => {
            setTimeout(() => {
                const numParticles = 36; // More particles
                for (let i = 0; i < numParticles; i++) {
                    const particle = new PIXI.Graphics() as Particle;
                    
                    // Larger, more dramatic particles
                    particle.beginFill(waveColor);
                    particle.drawCircle(0, 0, 4 + Math.random() * 8);
                    particle.endFill();
                    
                    // Start from random position within the player
                    const startRadius = 20;
                    const startAngle = (i / numParticles) * Math.PI * 2;
                    particle.x = x + Math.cos(startAngle) * startRadius * Math.random();
                    particle.y = y + Math.sin(startAngle) * startRadius * Math.random();
                    
                    // Explode outward with higher speed
                    const speed = 500 + Math.random() * 600;
                    particle.velocity = {
                        x: Math.cos(startAngle) * speed,
                        y: Math.sin(startAngle) * speed
                    };
                    
                    // Longer lifetime for more dramatic effect
                    particle.maxLifetime = 1000 + Math.random() * 500;
                    particle.lifetime = particle.maxLifetime;
                    particle.alpha = 1;

                    this.particles.push(particle);
                    this.container.addChild(particle);
                }
            }, delay);
        };

        // Create multiple waves of particles with different colors
        createParticleWave(0, colors[0]);     // Initial burst with player color
        createParticleWave(200, colors[1]);   // Second wave with white
        createParticleWave(400, colors[2]);   // Third wave with gold
        createParticleWave(600, colors[0]);   // Final wave with player color again

        // Create dramatic flash effect
        const flash = new PIXI.Graphics();
        flash.beginFill(0xFFFFFF);
        flash.drawCircle(x, y, 300); // Larger flash
        flash.endFill();
        flash.alpha = 0.9; // Brighter
        this.container.addChild(flash);

        // Fade out flash
        const fadeOutFlash = () => {
            flash.alpha -= 0.05;
            if (flash.alpha <= 0) {
                this.container.removeChild(flash);
            } else {
                requestAnimationFrame(fadeOutFlash);
            }
        };
        fadeOutFlash();
    }

    public createWeaponTrail(points: Array<{x: number, y: number}>, color: number, intensity: number = 1): void {
        const trail = new PIXI.Graphics();
        trail.lineStyle({
            width: 4 * intensity,
            color: color,
            alpha: 0.6 * intensity,
            join: PIXI.LINE_JOIN.ROUND,
            cap: PIXI.LINE_CAP.ROUND
        });
        
        // Draw the trail using the points
        trail.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            trail.lineTo(points[i].x, points[i].y);
        }
        
        // Add fade out effect
        const fadeOut = () => {
            trail.alpha -= 0.1;
            if (trail.alpha <= 0) {
                this.trailContainer.removeChild(trail);
            } else {
                requestAnimationFrame(fadeOut);
            }
        };
        
        this.trailContainer.addChild(trail);
        fadeOut();
    }

    public createAfterimage(entity: PIXI.Container, color: number = 0xFFFFFF): void {
        // Create a copy of the entity's sprite
        const afterimage = new PIXI.Graphics();
        
        // Get all Graphics children from the entity
        const sprites = entity.children.filter(child => child instanceof PIXI.Graphics) as PIXI.Graphics[];
        
        // Copy each sprite's geometry with the afterimage color
        sprites.forEach(sprite => {
            const commands = sprite.geometry.graphicsData;
            commands.forEach(data => {
                const fill = data.fillStyle;
                if (fill) {
                    afterimage.beginFill(color, 0.3);
                    afterimage.drawShape(data.shape);
                    afterimage.endFill();
                }
                const line = data.lineStyle;
                if (line) {
                    afterimage.lineStyle({
                        width: line.width,
                        color: color,
                        alpha: 0.3
                    });
                    afterimage.drawShape(data.shape);
                }
            });
        });

        // Position the afterimage at the entity's position
        afterimage.x = entity.x;
        afterimage.y = entity.y;
        afterimage.rotation = entity.rotation;
        
        // Add fade out effect with faster fade for snappier effect
        const fadeOut = () => {
            afterimage.alpha -= 0.15; // Faster fade
            if (afterimage.alpha <= 0) {
                this.container.removeChild(afterimage);
            } else {
                requestAnimationFrame(fadeOut);
            }
        };
        
        this.container.addChild(afterimage);
        fadeOut();
    }

    public update(delta: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update lifetime (delta is in seconds, so multiply by 1000 to convert maxLifetime from ms to seconds)
            particle.lifetime -= delta * 1000;
            
            // Update position (scale velocity by delta for frame-rate independent movement)
            particle.x += particle.velocity.x * delta;
            particle.y += particle.velocity.y * delta;
            
            // Stronger velocity decay (0.85 instead of 0.95)
            particle.velocity.x *= Math.pow(0.85, delta * 60);
            particle.velocity.y *= Math.pow(0.85, delta * 60);
            
            // Update alpha based on remaining lifetime with a sharper falloff
            particle.alpha = (particle.lifetime / particle.maxLifetime) ** 1.5;
            
            // Remove dead particles
            if (particle.lifetime <= 0) {
                this.container.removeChild(particle);
                this.particles.splice(i, 1);
            }
        }
    }
} 