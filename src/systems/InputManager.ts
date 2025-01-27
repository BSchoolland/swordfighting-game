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
    private static readonly DEADZONE = 0.1;
    private static readonly TRIGGER_THRESHOLD = 0.1;

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

                // Update dash state from left trigger
                if (this.gamepadState.triggers.left > InputManager.TRIGGER_THRESHOLD) {
                    this.isDashing = true;
                    this.hasGamepadInput = true;
                } else if (this.isDashing && !this.keys.has('Space')) {
                    this.isDashing = false;
                }
            }

            requestAnimationFrame(pollGamepad);
        };

        requestAnimationFrame(pollGamepad);
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
} 