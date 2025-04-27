export class InputManager {
    private keys: Set<string> = new Set();
    private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    private isDashing: boolean = false;
    private isMouseDown: boolean = false;
    private hasGamepadInput: boolean = false;
    private lastAimDirection: { x: number, y: number } = { x: 1, y: 0 };
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

    constructor() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        
        // Mouse events
        window.addEventListener('mousemove', (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
            // Reset gamepad input when mouse moves
            this.hasGamepadInput = false;
        });
        window.addEventListener('mousedown', () => {
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

        // Start gamepad polling
        this.startGamepadPolling();
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

    public getMovementVector(): { x: number, y: number } {
        let x = 0;
        let y = 0;

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

    public getMousePosition(): { x: number, y: number } {
        return this.mousePosition;
    }

    public isDashActive(): boolean {
        return this.isDashing || 
               (this.hasGamepadInput && this.gamepadState.triggers.left > InputManager.TRIGGER_THRESHOLD);
    }

    public getKeys(): Set<string> {
        return this.keys;
    }

    public isAttacking(): boolean {
        return this.isMouseDown || 
               (this.hasGamepadInput && this.gamepadState.triggers.right > InputManager.TRIGGER_THRESHOLD);
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
} 