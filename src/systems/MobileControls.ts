import * as PIXI from 'pixi.js';

// Define our own interface that doesn't conflict with the imported namespace
interface PixiInteractionEvent {
    data: {
        global: PIXI.Point;
        pointerId: number;
    };
    stopPropagation(): void;
}

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
    private resizeListener: (() => void) | null = null;

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
            this.setupResizeListener();
            
            // Update positions after setup
            this.updateControlPositions();
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize mobile controls:', error);
        }
    }

    private setupResizeListener(): void {
        // Store reference to the bound method so we can remove it later if needed
        this.resizeListener = this.updateControlPositions.bind(this);
        window.addEventListener('resize', this.resizeListener);
        
        // Also listen for orientation change events on mobile
        window.addEventListener('orientationchange', this.resizeListener);
    }

    private updateControlPositions(): void {
        if (!this.app || !this.app.screen || !this.isInitialized) return;
        
        // Update joystick start position
        this.joystickStartPosition = {
            x: 100,
            y: this.app.screen.height - 100
        };
        
        // Only update joystick position if it's not currently active
        if (this.joystick && !this.joystickActive) {
            this.joystick.position.set(this.joystickStartPosition.x, this.joystickStartPosition.y);
        }
        
        // Update attack button position
        if (this.attackButton) {
            this.attackButton.position.set(
                this.app.screen.width - 100,
                this.app.screen.height - 100
            );
        }
        
        // Update dash button position
        if (this.dashButton) {
            this.dashButton.position.set(
                this.app.screen.width - 100,
                this.app.screen.height - 200
            );
        }
        
        // Update hit area of the stage
        if (this.app && this.app.stage) {
            this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
        }
        
        console.log("Mobile controls positions updated for screen size:", 
                    this.app.screen.width, "x", this.app.screen.height);
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
        
        // Initialize as hidden
        this.joystick.visible = false;
        
        this.app.stage.addChild(this.joystick);
    }

    private setupButtons(): void {
        // Create attack button
        this.attackButton = this.createButton('ATTACK', 0xFF0000);
        this.attackButton.position.set(this.app.screen.width - 100, this.app.screen.height - 100);
        // Initialize as hidden
        this.attackButton.visible = false;
        this.app.stage.addChild(this.attackButton);

        // Create dash button
        this.dashButton = this.createButton('DASH', 0x0000FF);
        this.dashButton.position.set(this.app.screen.width - 100, this.app.screen.height - 200);
        // Initialize as hidden
        this.dashButton.visible = false;
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
        if (!this.app || !this.app.stage || !this.attackButton || !this.dashButton) return;
        
        // Make app stage interactive for joystick
        this.app.stage.interactive = true;
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
        
        // Left half of screen for joystick controls
        const leftHalfHitArea = new PIXI.Rectangle(0, 0, this.app.screen.width / 2, this.app.screen.height);
        
        // Track the pointer ID to handle multi-touch properly
        let activeJoystickPointerId: number | null = null;
        
        // Touch start anywhere on left half to activate joystick
        this.app.stage.on('pointerdown', (e: PixiInteractionEvent) => {
            const position = e.data.global;
            
            // Only activate joystick if touch is on left half of screen, no active joystick pointer,
            // AND the joystick is currently visible (not hidden by menus)
            if (position.x < this.app.screen.width / 2 && 
                activeJoystickPointerId === null &&
                this.joystick && this.joystick.visible) {
                activeJoystickPointerId = e.data.pointerId;
                this.joystickActive = true;
                
                // Move joystick base to touch position
                this.joystick.position.set(position.x, position.y);
                
                // Reset knob position relative to the base
                if (this.joystickKnob) {
                    this.joystickKnob.position.set(0, 0);
                }
                
                // Make joystick visible if it wasn't
                this.joystick.visible = true;
                this.joystick.alpha = 1;
                
                // Reset movement vector
                this.movementVector = { x: 0, y: 0 };
            }
        });
        
        // Handle touch move for joystick
        this.app.stage.on('pointermove', (e: PixiInteractionEvent) => {
            // Only process moves for the active joystick pointer ID
            if (this.joystickActive && e.data.pointerId === activeJoystickPointerId) {
                this.updateJoystickPosition(e.data.global);
            }
        });
        
        // Handle touch end
        this.app.stage.on('pointerup', (e: PixiInteractionEvent) => {
            // Only handle the end of the active joystick touch
            if (this.joystickActive && e.data.pointerId === activeJoystickPointerId) {
                activeJoystickPointerId = null;
                this.joystickActive = false;
                this.resetJoystick();
                
                // Return joystick to original position
                if (this.joystick) {
                    this.joystick.position.set(this.joystickStartPosition.x, this.joystickStartPosition.y);
                }
            }
        });
        
        this.app.stage.on('pointerupoutside', (e: PixiInteractionEvent) => {
            // Only handle the end of the active joystick touch
            if (this.joystickActive && e.data.pointerId === activeJoystickPointerId) {
                activeJoystickPointerId = null;
                this.joystickActive = false;
                this.resetJoystick();
                
                // Return joystick to original position
                if (this.joystick) {
                    this.joystick.position.set(this.joystickStartPosition.x, this.joystickStartPosition.y);
                }
            }
        });

        // Attack button events
        this.attackButton.on('pointerdown', (e: PixiInteractionEvent) => {
            // Stop event propagation to prevent it from reaching the stage
            e.stopPropagation();
            this.isAttacking = true;
        });
        
        this.attackButton.on('pointerup', (e: PixiInteractionEvent) => {
            // Stop event propagation
            e.stopPropagation();
            this.isAttacking = false;
        });
        
        this.attackButton.on('pointerupoutside', (e: PixiInteractionEvent) => {
            // Stop event propagation
            e.stopPropagation();
            this.isAttacking = false;
        });

        // Dash button events
        this.dashButton.on('pointerdown', (e: PixiInteractionEvent) => {
            // Stop event propagation to prevent it from reaching the stage
            e.stopPropagation();
            this.isDashing = true;
        });
        
        this.dashButton.on('pointerup', (e: PixiInteractionEvent) => {
            // Stop event propagation
            e.stopPropagation();
            this.isDashing = false;
        });
        
        this.dashButton.on('pointerupoutside', (e: PixiInteractionEvent) => {
            // Stop event propagation
            e.stopPropagation();
            this.isDashing = false;
        });
    }

    private updateJoystickPosition(globalPos: PIXI.Point): void {
        if (!this.joystickActive || !this.joystick || !this.joystickKnob) return;
        
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
        
        // Debug output
        console.log("Joystick Movement:", this.movementVector);
    }

    private resetJoystick(): void {
        if (this.joystickKnob) {
            this.joystickKnob.position.set(0, 0);
        }
        this.movementVector = { x: 0, y: 0 };
    }

    public getMovementVector(): { x: number, y: number } {
        // If controls are hidden or joystick is not visible, always return zero movement
        if (!this.isInitialized || (this.joystick && !this.joystick.visible)) {
            return { x: 0, y: 0 };
        }
        
        // Debug log when this method is called
        console.log("Getting joystick movement vector:", 
                   this.movementVector, 
                   "Active:", this.joystickActive);
        return this.movementVector;
    }

    public isAttackingPressed(): boolean {
        return this.isAttacking;
    }

    public isDashingPressed(): boolean {
        return this.isDashing;
    }

    public show(): void {
        try {
            console.log("MobileControls.show() called - showing controls", 
                        "isInitialized:", this.isInitialized);
            if (this.joystick && this.isInitialized) this.joystick.visible = true;
            if (this.attackButton && this.isInitialized) this.attackButton.visible = true;
            if (this.dashButton && this.isInitialized) this.dashButton.visible = true;
            
            // Update positions whenever showing controls
            this.updateControlPositions();
        } catch (error) {
            console.error("Error showing mobile controls:", error);
        }
    }

    public hide(): void {
        try {
            console.log("MobileControls.hide() called - hiding controls", 
                       "isInitialized:", this.isInitialized);
            if (this.joystick && this.isInitialized) this.joystick.visible = false;
            if (this.attackButton && this.isInitialized) this.attackButton.visible = false;
            if (this.dashButton && this.isInitialized) this.dashButton.visible = false;
            this.resetJoystick();
            this.isAttacking = false;
            this.isDashing = false;
        } catch (error) {
            console.error("Error hiding mobile controls:", error);
        }
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

    // Add a cleanup method to remove event listeners
    public cleanup(): void {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            window.removeEventListener('orientationchange', this.resizeListener);
            this.resizeListener = null;
        }
    }
} 