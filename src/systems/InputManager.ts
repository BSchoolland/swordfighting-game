import { Entity } from "../entities/Entity";
import { Player } from "../entities/Player";
import { MobileControls } from "./MobileControls";
import * as PIXI from 'pixi.js';

export class InputManager {
    private keys: Set<string> = new Set();
    private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    private isDashing: boolean = false;
    private isMouseDown: boolean = false;
    private hasGamepadInput: boolean = false;
    private lastAimDirection: { x: number, y: number } = { x: 1, y: 0 };
    private currentAimPosition: { x: number, y: number } = { x: 0, y: 0 };
    private mobileControls: MobileControls | null = null;
    private isMobile: boolean = false;
    private gamepadState: {
        leftStick: { x: number, y: number },
        rightStick: { x: number, y: number },
        buttons: boolean[],
        triggers: { left: number, right: number }
    } = {
        leftStick: { x: 0, y: 0 },
        rightStick: { x: 0, y: 0 },
        buttons: new Array(16).fill(false),
        triggers: { left: 0, right: 0 }
    };
    private previousGamepadState: {
        leftStick: { x: number, y: number },
        rightStick: { x: number, y: number },
        buttons: boolean[],
        triggers: { left: number, right: number }
    } = {
        leftStick: { x: 0, y: 0 },
        rightStick: { x: 0, y: 0 },
        buttons: new Array(16).fill(false),
        triggers: { left: 0, right: 0 }
    };
    
    // Direction status for menu navigation
    private directionStatus = {
        up: { pressed: false, lastUpdate: 0 },
        down: { pressed: false, lastUpdate: 0 },
        left: { pressed: false, lastUpdate: 0 },
        right: { pressed: false, lastUpdate: 0 }
    };
    
    private static readonly INPUT_REPEAT_DELAY = 300; // ms delay before repeating directional input
    private static readonly INPUT_REPEAT_RATE = 150;  // ms between repeats after initial delay
    private static readonly DEADZONE = 0.1;
    private static readonly TRIGGER_THRESHOLD = 0.1;
    private lastDirectionChangeTime = 0;
    private static readonly AIM_ASSIST_DELAY = 750;
    private static readonly AIM_ASSIST_SPEED = 0.05; // Speed of aim assist transition (0-1)
    private aimAssistEnabled: boolean = false;
    private static readonly STORAGE_KEY = 'pixel_rage_settings';
    
    // Gamepad button constants for readability
    public static readonly GAMEPAD = {
        BUTTON: {
            A: 0,
            B: 1,
            X: 2,
            Y: 3,
            LB: 4,
            RB: 5,
            LT: 6,
            RT: 7,
            BACK: 8,
            START: 9,
            L_STICK: 10,
            R_STICK: 11,
            DPAD_UP: 12,
            DPAD_DOWN: 13,
            DPAD_LEFT: 14,
            DPAD_RIGHT: 15
        }
    };

    constructor(app: PIXI.Application) {
        // Check if mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Initialize lastDirectionChangeTime on startup
        this.lastDirectionChangeTime = Date.now();
        
        if (this.isMobile) {
            try {
                this.mobileControls = new MobileControls(app);
            } catch (error) {
                console.error('Failed to initialize mobile controls:', error);
                this.isMobile = false; // Fall back to non-mobile controls
            }
        }

        // Keyboard events
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        
        // Mouse events
        window.addEventListener('mousemove', (e) => {
            // Ignore touch events from mobile controls
            if (this.isMobile && this.isFromMobileControls(e)) {
                return;
            }
            
            this.mousePosition = { x: e.clientX, y: e.clientY };
            // Reset gamepad input when mouse moves
            this.hasGamepadInput = false;
            this.lastDirectionChangeTime = Date.now();
        });
        window.addEventListener('mousedown', (e) => {
            // Ignore touch events from mobile controls
            if (this.isMobile && this.isFromMobileControls(e)) {
                return;
            }
            
            this.isMouseDown = true;
            // Reset gamepad input on mouse click
            this.hasGamepadInput = false;
        });
        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.isDashing = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isDashing = false;
            }
        });

        // Load settings
        this.loadSettings();
        
        // Start gamepad polling
        this.startGamepadPolling();
    }

    private loadSettings(): void {
        const settings = localStorage.getItem(InputManager.STORAGE_KEY);
        if (settings) {
            const { aimAssistEnabled } = JSON.parse(settings);
            this.aimAssistEnabled = aimAssistEnabled;
        } else {
            // First time setup - check if mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            this.aimAssistEnabled = isMobile;
            this.saveSettings();
        }
    }

    private saveSettings(): void {
        const settings = {
            aimAssistEnabled: this.aimAssistEnabled
        };
        localStorage.setItem(InputManager.STORAGE_KEY, JSON.stringify(settings));
    }

    public setAimAssistEnabled(enabled: boolean): void {
        this.aimAssistEnabled = enabled;
        this.saveSettings();
    }

    public isAimAssistEnabled(): boolean {
        return this.aimAssistEnabled;
    }

    private startGamepadPolling(): void {
        const pollGamepad = () => {
            const gamepads = navigator.getGamepads();
            const gamepad = gamepads[0]; // Use first connected gamepad

            if (gamepad) {
                // Store previous state for button press detection
                this.previousGamepadState = JSON.parse(JSON.stringify(this.gamepadState));
                
                // Update stick positions with deadzone
                const applyDeadzone = (value: number) => 
                    Math.abs(value) < InputManager.DEADZONE ? 0 : value;

                const newLeftStick = {
                    x: applyDeadzone(gamepad.axes[0]),
                    y: applyDeadzone(gamepad.axes[1])
                };

                const newRightStick = {
                    x: applyDeadzone(gamepad.axes[2]),
                    y: applyDeadzone(gamepad.axes[3])
                };

                // Check if there's actual gamepad input
                if (Math.abs(newLeftStick.x) > InputManager.DEADZONE || 
                    Math.abs(newLeftStick.y) > InputManager.DEADZONE ||
                    Math.abs(newRightStick.x) > InputManager.DEADZONE ||
                    Math.abs(newRightStick.y) > InputManager.DEADZONE) {
                    this.hasGamepadInput = true;
                }

                this.gamepadState.leftStick = newLeftStick;
                this.gamepadState.rightStick = newRightStick;

                // Update triggers using buttons instead of axes
                this.gamepadState.triggers = {
                    left: gamepad.buttons[6]?.value || 0,  // LT
                    right: gamepad.buttons[7]?.value || 0  // RT
                };

                // Check if triggers are being used
                if (this.gamepadState.triggers.left > InputManager.TRIGGER_THRESHOLD ||
                    this.gamepadState.triggers.right > InputManager.TRIGGER_THRESHOLD) {
                    this.hasGamepadInput = true;
                }

                // Update button states
                this.gamepadState.buttons = gamepad.buttons.map(b => b.pressed);
                
                // Check if any button is pressed
                if (this.gamepadState.buttons.some(b => b)) {
                    this.hasGamepadInput = true;
                }

                // Update dash state from left trigger
                if (this.gamepadState.triggers.left > InputManager.TRIGGER_THRESHOLD) {
                    this.isDashing = true;
                    this.hasGamepadInput = true;
                } else if (this.isDashing && !this.keys.has('Space')) {
                    this.isDashing = false;
                }
                
                // Update direction status for UI navigation
                this.updateDirectionStatus();
            }

            requestAnimationFrame(pollGamepad);
        };

        requestAnimationFrame(pollGamepad);
    }
    
    private updateDirectionStatus(): void {
        const now = Date.now();
        
        // Process directional inputs (D-Pad and left stick)
        // Up direction
        if (this.gamepadState.buttons[InputManager.GAMEPAD.BUTTON.DPAD_UP] || 
            this.gamepadState.leftStick.y < -InputManager.DEADZONE) {
            
            if (!this.directionStatus.up.pressed || 
                (now - this.directionStatus.up.lastUpdate > 
                 (this.directionStatus.up.lastUpdate === 0 ? 
                  InputManager.INPUT_REPEAT_DELAY : InputManager.INPUT_REPEAT_RATE))) {
                
                this.directionStatus.up.pressed = true;
                this.directionStatus.up.lastUpdate = now;
            }
        } else {
            this.directionStatus.up.pressed = false;
            this.directionStatus.up.lastUpdate = 0;
        }
        
        // Down direction
        if (this.gamepadState.buttons[InputManager.GAMEPAD.BUTTON.DPAD_DOWN] || 
            this.gamepadState.leftStick.y > InputManager.DEADZONE) {
            
            if (!this.directionStatus.down.pressed || 
                (now - this.directionStatus.down.lastUpdate > 
                 (this.directionStatus.down.lastUpdate === 0 ? 
                  InputManager.INPUT_REPEAT_DELAY : InputManager.INPUT_REPEAT_RATE))) {
                
                this.directionStatus.down.pressed = true;
                this.directionStatus.down.lastUpdate = now;
            }
        } else {
            this.directionStatus.down.pressed = false;
            this.directionStatus.down.lastUpdate = 0;
        }
        
        // Left direction
        if (this.gamepadState.buttons[InputManager.GAMEPAD.BUTTON.DPAD_LEFT] || 
            this.gamepadState.leftStick.x < -InputManager.DEADZONE) {
            
            if (!this.directionStatus.left.pressed || 
                (now - this.directionStatus.left.lastUpdate > 
                 (this.directionStatus.left.lastUpdate === 0 ? 
                  InputManager.INPUT_REPEAT_DELAY : InputManager.INPUT_REPEAT_RATE))) {
                
                this.directionStatus.left.pressed = true;
                this.directionStatus.left.lastUpdate = now;
            }
        } else {
            this.directionStatus.left.pressed = false;
            this.directionStatus.left.lastUpdate = 0;
        }
        
        // Right direction
        if (this.gamepadState.buttons[InputManager.GAMEPAD.BUTTON.DPAD_RIGHT] || 
            this.gamepadState.leftStick.x > InputManager.DEADZONE) {
            
            if (!this.directionStatus.right.pressed || 
                (now - this.directionStatus.right.lastUpdate > 
                 (this.directionStatus.right.lastUpdate === 0 ? 
                  InputManager.INPUT_REPEAT_DELAY : InputManager.INPUT_REPEAT_RATE))) {
                
                this.directionStatus.right.pressed = true;
                this.directionStatus.right.lastUpdate = now;
            }
        } else {
            this.directionStatus.right.pressed = false;
            this.directionStatus.right.lastUpdate = 0;
        }
    }

    public showMobileControls(): void {
        // Only show controls if we're actually on a mobile device
        if (this.mobileControls && this.isMobile) {
            console.log("Showing mobile controls");
            this.mobileControls.show();
            
            // Reset lastDirectionChangeTime when showing mobile controls
            // This ensures aim assist will start working after a brief delay
            this.lastDirectionChangeTime = Date.now();
        }
    }

    public hideMobileControls(): void {
        // Always hide controls regardless of device type for safety
        if (this.mobileControls) {
            console.log("Hiding mobile controls");
            this.mobileControls.hide();
        }
    }

    public getMovementVector(): { x: number, y: number } {
        let x = 0;
        let y = 0;

        // Mobile controls take priority on mobile devices
        if (this.isMobile && this.mobileControls) {
            const mobileVector = this.mobileControls.getMovementVector();
            if (Math.abs(mobileVector.x) > 0.1 || Math.abs(mobileVector.y) > 0.1) {
                return mobileVector; // Return directly if using joystick
            }
        }

        // Keyboard input
        if (this.keys.has('KeyA')) x -= 1;
        if (this.keys.has('KeyD')) x += 1;
        if (this.keys.has('KeyW')) y -= 1;
        if (this.keys.has('KeyS')) y += 1;

        // Gamepad left stick input
        if (this.hasGamepadInput) {
            x += this.gamepadState.leftStick.x;
            y += this.gamepadState.leftStick.y;
        }

        // Normalize if length > 1
        const length = Math.sqrt(x * x + y * y);
        if (length > 1) {
            x /= length;
            y /= length;
        }

        return { x, y };
    }

    public getAimDirection(): { x: number, y: number } {
        let newAimDirection = null;

        // Check for gamepad input first if using gamepad
        if (this.hasGamepadInput && 
            (Math.abs(this.gamepadState.rightStick.x) > InputManager.DEADZONE || 
             Math.abs(this.gamepadState.rightStick.y) > InputManager.DEADZONE)) {
            newAimDirection = this.gamepadState.rightStick;
        }
        // Check for mouse input
        else if (!this.hasGamepadInput) {
            const center = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
            const dx = this.mousePosition.x - center.x;
            const dy = this.mousePosition.y - center.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                newAimDirection = { x: dx / length, y: dy / length };
            }
        }

        // Update last aim direction if we have new input
        if (newAimDirection) {
            this.lastAimDirection = newAimDirection;
        }

        return this.lastAimDirection;
    }

    public isKeyPressed(code: string): boolean {
        return this.keys.has(code);
    }

    public getMousePosition(player: Player, enemies: Entity[]): { x: number, y: number, convert?: boolean } {
        if (this.aimAssistEnabled && this.lastDirectionChangeTime && Date.now() - this.lastDirectionChangeTime > InputManager.AIM_ASSIST_DELAY) {
            // Find nearest enemy
            let nearestEnemy: Entity | null = null;
            let minDistance = Infinity;
            
            for (const enemy of enemies) {
                if (!enemy.isAlive()) continue;
                
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemy;
                }
            }
            
            if (nearestEnemy) {
                // Gradually move current aim position towards the enemy
                this.currentAimPosition.x += (nearestEnemy.x - this.currentAimPosition.x) * InputManager.AIM_ASSIST_SPEED;
                this.currentAimPosition.y += (nearestEnemy.y - this.currentAimPosition.y) * InputManager.AIM_ASSIST_SPEED;
                return { x: this.currentAimPosition.x, y: this.currentAimPosition.y };
            } else {
                // move towards 0 0
                this.currentAimPosition.x += (0 - this.currentAimPosition.x) * InputManager.AIM_ASSIST_SPEED;
                this.currentAimPosition.y += (0 - this.currentAimPosition.y) * InputManager.AIM_ASSIST_SPEED;
                return { x: this.currentAimPosition.x, y: this.currentAimPosition.y };
            }
        }
        
        // Reset current aim position to mouse position when not using aim assist
        this.currentAimPosition.x = this.mousePosition.x;
        this.currentAimPosition.y = this.mousePosition.y;
        return { x: this.mousePosition.x, y: this.mousePosition.y, convert: true };
    }

    public isAttacking(): boolean {
        return this.isMouseDown || 
               (this.hasGamepadInput && this.gamepadState.triggers.right > InputManager.TRIGGER_THRESHOLD) ||
               (this.mobileControls?.isAttackingPressed() || false);
    }

    public isDashActive(): boolean {
        return this.isDashing || 
               (this.hasGamepadInput && this.gamepadState.triggers.left > InputManager.TRIGGER_THRESHOLD) ||
               (this.mobileControls?.isDashingPressed() || false);
    }

    public getKeys(): Set<string> {
        return this.keys;
    }

    public isUsingGamepad(): boolean {
        return this.hasGamepadInput;
    }
    
    // New methods for UI navigation with gamepad
    
    /**
     * Checks if a button was just pressed (not held down)
     */
    public isButtonJustPressed(buttonIndex: number): boolean {
        return this.gamepadState.buttons[buttonIndex] && !this.previousGamepadState.buttons[buttonIndex];
    }
    
    /**
     * Checks if the primary action button (A button or Space) was just pressed
     */
    public isPrimaryActionJustPressed(): boolean {
        return this.isButtonJustPressed(InputManager.GAMEPAD.BUTTON.A) || 
               (this.keys.has('Space') && !this.previousGamepadState.buttons[InputManager.GAMEPAD.BUTTON.A]);
    }
    
    /**
     * Checks if the secondary action button (B button or Escape) was just pressed
     */
    public isSecondaryActionJustPressed(): boolean {
        return this.isButtonJustPressed(InputManager.GAMEPAD.BUTTON.B) || 
               (this.keys.has('Escape') && !this.previousGamepadState.buttons[InputManager.GAMEPAD.BUTTON.B]);
    }
    
    /**
     * Checks if the menu/pause button (Start button or Escape) was just pressed
     */
    public isMenuButtonJustPressed(): boolean {
        return this.isButtonJustPressed(InputManager.GAMEPAD.BUTTON.START) || 
               (this.keys.has('Escape') && !this.previousGamepadState.buttons[InputManager.GAMEPAD.BUTTON.START]);
    }
    
    /**
     * Checks if UI should navigate up (with built-in repeat delay)
     */
    public isMenuUpTriggered(): boolean {
        return this.directionStatus.up.pressed;
    }
    
    /**
     * Checks if UI should navigate down (with built-in repeat delay)
     */
    public isMenuDownTriggered(): boolean {
        return this.directionStatus.down.pressed;
    }
    
    /**
     * Checks if UI should navigate left (with built-in repeat delay)
     */
    public isMenuLeftTriggered(): boolean {
        return this.directionStatus.left.pressed;
    }
    
    /**
     * Checks if UI should navigate right (with built-in repeat delay)
     */
    public isMenuRightTriggered(): boolean {
        return this.directionStatus.right.pressed;
    }

    // Helper to check if an event is from our mobile controls
    private isFromMobileControls(event: any): boolean {
        if (!this.mobileControls) return false;
        
        // Get the attack and dash button positions
        const attackButton = this.mobileControls.getAttackButtonPosition();
        const dashButton = this.mobileControls.getDashButtonPosition();
        const joystick = this.mobileControls.getJoystickPosition();
        
        // Define regions where mobile controls are located
        if (attackButton) {
            // Check if event is within attack button area 
            const dx = event.clientX - attackButton.x;
            const dy = event.clientY - attackButton.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 50) return true;
        }
        
        if (dashButton) {
            // Check if event is within dash button area
            const dx = event.clientX - dashButton.x;
            const dy = event.clientY - dashButton.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 50) return true;
        }
        
        if (joystick) {
            // Check if event is within joystick area or left side of screen
            if (event.clientX < window.innerWidth / 2) return true;
        }
        
        return false;
    }
} 