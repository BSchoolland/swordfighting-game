import * as PIXI from 'pixi.js';

export class MobileControls {
    private app: PIXI.Application;
    private joystick: PIXI.Container | null = null;
    private joystickKnob: PIXI.Graphics | null = null;
    private joystickBase: PIXI.Graphics | null = null;
    private joystickPosition: { x: number, y: number } = { x: 0, y: 0 };
    private joystickActive: boolean = false;
    private joystickRadius: number = 50;
    private joystickKnobRadius: number = 20;
    private joystickStartPosition: { x: number, y: number } = { x: 0, y: 0 };
    
    private attackButton: PIXI.Container | null = null;
    private dashButton: PIXI.Container | null = null;
    
    private movementVector: { x: number, y: number } = { x: 0, y: 0 };
    private isAttacking: boolean = false;
    private isDashing: boolean = false;
    private isInitialized: boolean = false;
    private isTouchDevice: boolean = false;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.isTouchDevice = 'ontouchstart' in window;
        // Wait for the next frame to ensure app is fully initialized
        requestAnimationFrame(() => {
            this.initialize();
        });
    }

    private initialize(): void {
        if (!this.app || !this.app.screen) {
            console.warn('PIXI Application not ready for mobile controls');
            return;
        }

        try {
            this.setupJoystick();
            this.setupButtons();
            this.setupTouchEvents();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize mobile controls:', error);
        }
    }

    private setupJoystick(): void {
        if (!this.app || !this.app.screen) return;

        // Create joystick base
        this.joystickBase = new PIXI.Graphics();
        this.joystickBase.beginFill(0x000000, 0.5);
        this.joystickBase.drawCircle(0, 0, this.joystickRadius);
        this.joystickBase.endFill();
        this.joystickBase.lineStyle(2, 0xFFFFFF, 0.5);
        this.joystickBase.drawCircle(0, 0, this.joystickRadius);
        this.joystickBase.alpha = 0.7;

        // Create joystick knob
        this.joystickKnob = new PIXI.Graphics();
        this.joystickKnob.beginFill(0xFFFFFF, 0.8);
        this.joystickKnob.drawCircle(0, 0, this.joystickKnobRadius);
        this.joystickKnob.endFill();

        // Create container for joystick
        this.joystick = new PIXI.Container();
        this.joystick.addChild(this.joystickBase);
        this.joystick.addChild(this.joystickKnob);
        
        // Position joystick at bottom left
        this.joystickStartPosition = { 
            x: 100, 
            y: this.app.screen.height - 100 
        };
        this.joystick.position.set(this.joystickStartPosition.x, this.joystickStartPosition.y);
        
        this.app.stage.addChild(this.joystick);
    }

    private setupButtons(): void {
        // Create attack button
        this.attackButton = this.createButton('ATTACK', 0xFF0000);
        this.attackButton.position.set(this.app.screen.width - 100, this.app.screen.height - 100);
        this.app.stage.addChild(this.attackButton);

        // Create dash button
        this.dashButton = this.createButton('DASH', 0x0000FF);
        this.dashButton.position.set(this.app.screen.width - 100, this.app.screen.height - 200);
        this.app.stage.addChild(this.dashButton);
    }

    private createButton(text: string, color: number): PIXI.Container {
        const container = new PIXI.Container();
        
        // Button background
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.5);
        bg.drawCircle(0, 0, 40);
        bg.endFill();
        bg.lineStyle(2, color, 0.8);
        bg.drawCircle(0, 0, 40);
        
        // Button text
        const buttonText = new PIXI.Text(text, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: color,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        
        container.addChild(bg);
        container.addChild(buttonText);
        container.interactive = true;
        // @ts-ignore - Using buttonMode for backward compatibility
        container.buttonMode = true;  // Changes cursor to pointer
        
        return container;
    }

    private setupTouchEvents(): void {
        // Make app stage interactive for joystick
        this.app.stage.interactive = true;
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
        
        // Left half of screen for joystick controls
        const leftHalfHitArea = new PIXI.Rectangle(0, 0, this.app.screen.width / 2, this.app.screen.height);
        
        // Touch start anywhere on left half to activate joystick
        this.app.stage.on('pointerdown', (e: PIXI.InteractionEvent) => {
            const position = e.data.global;
            
            // Only activate joystick if touch is on left half of screen
            if (position.x < this.app.screen.width / 2) {
                this.joystickActive = true;
                
                // Move joystick base to touch position
                this.joystick.position.set(position.x, position.y);
                
                // Reset knob position relative to the base
                this.joystickKnob.position.set(0, 0);
                
                // Make joystick visible if it wasn't
                this.joystick.visible = true;
                this.joystick.alpha = 1;
                
                // Reset movement vector
                this.movementVector = { x: 0, y: 0 };
            }
        });
        
        // Handle touch move for joystick
        this.app.stage.on('pointermove', (e: PIXI.InteractionEvent) => {
            if (this.joystickActive) {
                this.updateJoystickPosition(e.data.global);
            }
        });
        
        // Handle touch end
        this.app.stage.on('pointerup', () => {
            if (this.joystickActive) {
                this.joystickActive = false;
                this.resetJoystick();
                
                // Return joystick to original position with animation
                // or just hide it
                this.joystick.position.set(this.joystickStartPosition.x, this.joystickStartPosition.y);
            }
        });
        
        this.app.stage.on('pointerupoutside', () => {
            if (this.joystickActive) {
                this.joystickActive = false;
                this.resetJoystick();
                
                // Return joystick to original position with animation
                // or just hide it
                this.joystick.position.set(this.joystickStartPosition.x, this.joystickStartPosition.y);
            }
        });

        // Attack button events
        this.attackButton.on('pointerdown', () => {
            this.isAttacking = true;
        });
        
        this.attackButton.on('pointerup', () => {
            this.isAttacking = false;
        });
        
        this.attackButton.on('pointerupoutside', () => {
            this.isAttacking = false;
        });

        // Dash button events
        this.dashButton.on('pointerdown', () => {
            this.isDashing = true;
        });
        
        this.dashButton.on('pointerup', () => {
            this.isDashing = false;
        });
        
        this.dashButton.on('pointerupoutside', () => {
            this.isDashing = false;
        });
    }

    private updateJoystickPosition(globalPos: PIXI.Point): void {
        if (!this.joystickActive || !this.joystick) return;
        
        // Convert global position to position relative to joystick base
        const localPos = this.joystick.toLocal(globalPos);
        const distance = Math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y);
        
        if (distance > this.joystickRadius) {
            // If touch is beyond the joystick radius, normalize to the edge
            const angle = Math.atan2(localPos.y, localPos.x);
            this.joystickKnob.position.set(
                Math.cos(angle) * this.joystickRadius,
                Math.sin(angle) * this.joystickRadius
            );
        } else {
            // Otherwise, move knob directly to touch position
            this.joystickKnob.position.set(localPos.x, localPos.y);
        }
        
        // Update movement vector (normalized to -1 to 1 range)
        this.movementVector = {
            x: this.joystickKnob.position.x / this.joystickRadius,
            y: this.joystickKnob.position.y / this.joystickRadius
        };
    }

    private resetJoystick(): void {
        this.joystickKnob.position.set(0, 0);
        this.movementVector = { x: 0, y: 0 };
    }

    public getMovementVector(): { x: number, y: number } {
        return this.movementVector;
    }

    public isAttackingPressed(): boolean {
        return this.isAttacking;
    }

    public isDashingPressed(): boolean {
        return this.isDashing;
    }

    public show(): void {
        if (this.joystick) this.joystick.visible = true;
        if (this.attackButton) this.attackButton.visible = true;
        if (this.dashButton) this.dashButton.visible = true;
    }

    public hide(): void {
        if (this.joystick) this.joystick.visible = false;
        if (this.attackButton) this.attackButton.visible = false;
        if (this.dashButton) this.dashButton.visible = false;
        this.resetJoystick();
        this.isAttacking = false;
        this.isDashing = false;
    }
    
    // Position getters for InputManager to detect overlaps
    public getAttackButtonPosition(): {x: number, y: number} | null {
        if (!this.attackButton) return null;
        return {
            x: this.attackButton.position.x,
            y: this.attackButton.position.y
        };
    }
    
    public getDashButtonPosition(): {x: number, y: number} | null {
        if (!this.dashButton) return null;
        return {
            x: this.dashButton.position.x,
            y: this.dashButton.position.y
        };
    }
    
    public getJoystickPosition(): {x: number, y: number} | null {
        if (!this.joystick) return null;
        return {
            x: this.joystick.position.x,
            y: this.joystick.position.y
        };
    }
} 