export class InputManager {
    private keys: Set<string> = new Set();
    private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    private isDashing: boolean = false;
    private isMouseDown: boolean = false;

    constructor() {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        window.addEventListener('mousemove', (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mousedown', () => {
            this.isMouseDown = true;
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

    public getKeys(): Set<string> {
        return this.keys;
    }

    public isAttacking(): boolean {
        return this.isMouseDown;
    }
} 