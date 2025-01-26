# Input System Documentation

The input system manages keyboard and mouse interactions, providing a clean interface for handling player controls and game interactions.

## Core Components

### Keyboard Manager
```typescript
class KeyboardManager {
    private keys: Map<string, boolean> = new Map();
    
    public isDown(key: string): boolean {
        return this.keys.get(key) || false;
    }
    
    public update(): void {
        // Process key states
    }
}
```

### Mouse Manager
```typescript
class MouseManager {
    public position: { x: number, y: number } = { x: 0, y: 0 };
    public buttons: Map<number, boolean> = new Map();
    
    public isButtonDown(button: number): boolean {
        return this.buttons.get(button) || false;
    }
}
```

## Input Handling

### Keyboard Events
```typescript
window.addEventListener('keydown', (event: KeyboardEvent) => {
    this.keys.set(event.key.toLowerCase(), true);
});

window.addEventListener('keyup', (event: KeyboardEvent) => {
    this.keys.set(event.key.toLowerCase(), false);
});
```

### Mouse Events
```typescript
canvas.addEventListener('mousemove', (event: MouseEvent) => {
    this.position.x = event.clientX - canvas.offsetLeft;
    this.position.y = event.clientY - canvas.offsetTop;
});

canvas.addEventListener('mousedown', (event: MouseEvent) => {
    this.buttons.set(event.button, true);
});
```

## Player Controls

### Movement Controls
```typescript
const CONTROLS = {
    UP: ['w', 'ArrowUp'],
    DOWN: ['s', 'ArrowDown'],
    LEFT: ['a', 'ArrowLeft'],
    RIGHT: ['d', 'ArrowRight']
};

function getMovementVector(): { x: number, y: number } {
    const movement = { x: 0, y: 0 };
    
    if (this.keyboard.isDown(CONTROLS.UP)) movement.y -= 1;
    if (this.keyboard.isDown(CONTROLS.DOWN)) movement.y += 1;
    if (this.keyboard.isDown(CONTROLS.LEFT)) movement.x -= 1;
    if (this.keyboard.isDown(CONTROLS.RIGHT)) movement.x += 1;
    
    // Normalize diagonal movement
    if (movement.x !== 0 && movement.y !== 0) {
        const length = Math.sqrt(2);
        movement.x /= length;
        movement.y /= length;
    }
    
    return movement;
}
```

### Combat Controls
```typescript
function handleCombatInput(): void {
    // Attack on left click
    if (this.mouse.isButtonDown(0)) {
        this.player.attack();
    }
    
    // Update facing direction
    const angle = Math.atan2(
        this.mouse.position.y - this.player.y,
        this.mouse.position.x - this.player.x
    );
    this.player.rotation = angle;
}
```

## Input States

### Button States
- PRESSED: Initial press
- HELD: Continuous press
- RELEASED: Button up
- IDLE: No interaction

### State Detection
```typescript
class InputState {
    private previousState: boolean = false;
    private currentState: boolean = false;
    
    public update(isDown: boolean): void {
        this.previousState = this.currentState;
        this.currentState = isDown;
    }
    
    public isPressed(): boolean {
        return this.currentState && !this.previousState;
    }
    
    public isHeld(): boolean {
        return this.currentState && this.previousState;
    }
    
    public isReleased(): boolean {
        return !this.currentState && this.previousState;
    }
}
```

## Input Mapping

### Control Configuration
```typescript
interface ControlMap {
    [action: string]: {
        keys: string[];
        mouseButtons?: number[];
        description: string;
    }
}

const DEFAULT_CONTROLS: ControlMap = {
    MOVE_UP: {
        keys: ['w', 'ArrowUp'],
        description: 'Move upward'
    },
    ATTACK: {
        keys: [],
        mouseButtons: [0],
        description: 'Perform attack'
    }
};
```

### Rebinding System
```typescript
class ControlMapper {
    private bindings: ControlMap;
    
    public rebind(action: string, key: string): void {
        this.bindings[action].keys = [key];
    }
    
    public resetToDefault(): void {
        this.bindings = { ...DEFAULT_CONTROLS };
    }
}
```

## Input Processing

### Update Cycle
```typescript
class InputManager {
    private keyboard: KeyboardManager;
    private mouse: MouseManager;
    private mapper: ControlMapper;
    
    public update(): void {
        this.keyboard.update();
        this.mouse.update();
        this.processInputStates();
    }
    
    public isActionActive(action: string): boolean {
        const binding = this.mapper.getBinding(action);
        return binding.keys.some(key => this.keyboard.isDown(key)) ||
               binding.mouseButtons?.some(button => this.mouse.isButtonDown(button));
    }
}
```

### Input Buffer
```typescript
class InputBuffer {
    private buffer: string[] = [];
    private bufferTime: number = 200; // ms
    private lastInputTime: number = 0;
    
    public addInput(input: string): void {
        const currentTime = performance.now();
        if (currentTime - this.lastInputTime > this.bufferTime) {
            this.buffer = [];
        }
        
        this.buffer.push(input);
        this.lastInputTime = currentTime;
    }
}
```

## Debug Features

### Input Visualization
```typescript
function drawInputDebug(): void {
    // Draw current keys pressed
    const activeKeys = Array.from(this.keyboard.keys.entries())
        .filter(([_, isDown]) => isDown)
        .map(([key]) => key);
    
    // Draw mouse position and buttons
    const mouseState = {
        position: this.mouse.position,
        buttons: Array.from(this.mouse.buttons.entries())
    };
}
```

### Input Recording
```typescript
class InputRecorder {
    private recording: {
        timestamp: number;
        input: string;
        state: boolean;
    }[] = [];
    
    public startRecording(): void {
        this.recording = [];
    }
    
    public recordInput(input: string, state: boolean): void {
        this.recording.push({
            timestamp: performance.now(),
            input,
            state
        });
    }
}
```

## Best Practices

### Responsiveness
- Minimal input latency
- Consistent polling
- Input buffering
- Frame-independent processing

### Flexibility
- Rebindable controls
- Multiple input methods
- Configurable sensitivity
- Action mapping

### Robustness
- Handle multiple inputs
- Prevent input conflicts
- Graceful error handling
- State validation 