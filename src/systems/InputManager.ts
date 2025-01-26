export class InputManager {
    private keys: Set<string> = new Set();
    private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    private isDashing: boolean = false;
    private lastDashTime: number = 0;
    private static readonly DASH_COOLDOWN = 500; // milliseconds
    private static readonly DASH_DURATION = 200; // milliseconds

    constructor() {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        window.addEventListener('mousemove', (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.tryDash();
            }
        });
    }

    private tryDash(): void {
        const currentTime = Date.now();
        if (!this.isDashing && currentTime - this.lastDashTime >= InputManager.DASH_COOLDOWN) {
            this.isDashing = true;
            this.lastDashTime = currentTime;
            
            // Automatically end dash after duration
            setTimeout(() => {
                this.isDashing = false;
            }, InputManager.DASH_DURATION);
        }
    }

    public isKeyPressed(code: string): boolean {
        return this.keys.has(code);
    }

    public getMousePosition(): { x: number, y: number } {
        return this.mousePosition;
    }

    public isDashActive(): boolean {
        return this.isDashing;
    }

    public getDashCooldownProgress(): number {
        const currentTime = Date.now();
        const timeSinceLastDash = currentTime - this.lastDashTime;
        return Math.min(1, timeSinceLastDash / InputManager.DASH_COOLDOWN);
    }

    public getKeys(): Set<string> {
        return this.keys;
    }
} 