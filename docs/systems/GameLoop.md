# Game Loop Documentation

The game loop is the core system that drives the game's update and render cycle, managing entity updates, input processing, and frame timing.

## Core Components

### Main Loop Structure
```typescript
class Game {
    private app: PIXI.Application;
    private entities: Entity[];
    private lastTime: number;

    private gameLoop(currentTime: number): void {
        // Calculate delta time
        const delta = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update game state
        this.update(delta);

        // Render frame
        this.render();

        // Queue next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}
```

## Update Sequence

### 1. Input Processing
```typescript
private processInput(): void {
    // Keyboard state
    this.keyboard.update();
    
    // Mouse position and buttons
    this.mouse.update();
    
    // Process player input
    this.player.handleInput(this.keyboard, this.mouse);
}
```

### 2. Entity Updates
```typescript
private updateEntities(delta: number): void {
    // Update player
    this.player.update(delta);
    
    // Update enemies
    this.enemies.forEach(enemy => enemy.update(delta));
    
    // Update projectiles/effects
    this.effects.forEach(effect => effect.update(delta));
}
```

### 3. Collision Detection
```typescript
private checkCollisions(): void {
    // Entity-Entity collisions
    for (let i = 0; i < this.entities.length; i++) {
        for (let j = i + 1; j < this.entities.length; j++) {
            if (this.entities[i].collidesWith(this.entities[j])) {
                this.handleCollision(this.entities[i], this.entities[j]);
            }
        }
    }
}
```

### 4. State Updates
```typescript
private updateGameState(): void {
    // Check win/loss conditions
    this.checkGameOver();
    
    // Update scores/timers
    this.updateUI();
    
    // Clean up dead entities
    this.removeDeadEntities();
}
```

## Timing System

### Delta Time
- Time-based updates for smooth motion
- Frame-independent physics
- Consistent game speed
- Performance monitoring

### Frame Rate Management
```typescript
const MAX_DELTA = 32; // Cap at ~30 FPS minimum
const FRAME_TIME = 16.67; // Target 60 FPS

private getAdjustedDelta(rawDelta: number): number {
    // Clamp delta to prevent spiral of death
    return Math.min(rawDelta, MAX_DELTA);
}
```

## Render Pipeline

### Scene Graph
1. Clear previous frame
2. Update transforms
3. Render entities
4. Apply post-processing
5. Present frame

### Layer Management
```typescript
private setupLayers(): void {
    this.backgroundLayer = new PIXI.Container();
    this.entityLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    
    this.app.stage.addChild(this.backgroundLayer);
    this.app.stage.addChild(this.entityLayer);
    this.app.stage.addChild(this.uiLayer);
}
```

## State Management

### Game States
- LOADING
- TITLE
- PLAYING
- PAUSED
- GAME_OVER

### State Transitions
```typescript
private changeState(newState: GameState): void {
    // Exit current state
    this.exitState(this.currentState);
    
    // Enter new state
    this.currentState = newState;
    this.enterState(newState);
}
```

## Performance Optimization

### Entity Pooling
```typescript
class EntityPool<T extends Entity> {
    private pool: T[] = [];
    
    public spawn(): T {
        return this.pool.pop() || this.createNew();
    }
    
    public recycle(entity: T): void {
        this.pool.push(entity);
    }
}
```

### Spatial Partitioning
```typescript
class QuadTree {
    private bounds: PIXI.Rectangle;
    private objects: Entity[] = [];
    private children: QuadTree[] = [];
    
    public query(area: PIXI.Rectangle): Entity[] {
        // Return entities in specified area
    }
}
```

## Debug Features

### Performance Monitoring
```typescript
private debugInfo = {
    fps: 0,
    entityCount: 0,
    updateTime: 0,
    renderTime: 0
};

private updateDebugInfo(delta: number): void {
    this.debugInfo.fps = 1000 / delta;
    this.debugInfo.entityCount = this.entities.length;
}
```

### Visual Debug
- Collision boundaries
- Update frequency
- Entity states
- Performance graphs

## Usage Example

```typescript
class Game {
    constructor() {
        // Initialize PIXI Application
        this.app = new PIXI.Application({
            width: 800,
            height: 600,
            backgroundColor: 0x000000
        });
        
        // Setup game
        this.setupLayers();
        this.initializeEntities();
        
        // Start game loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    private update(delta: number): void {
        // Process current frame
        this.processInput();
        this.updateEntities(delta);
        this.checkCollisions();
        this.updateGameState();
        
        // Debug
        if (this.debugMode) {
            this.updateDebugInfo(delta);
        }
    }
}
```

## Best Practices

### Performance
- Use delta time for updates
- Implement entity pooling
- Optimize collision checks
- Manage memory usage

### Stability
- Cap delta time
- Handle edge cases
- Graceful error recovery
- State validation

### Maintainability
- Clear update sequence
- State encapsulation
- Debug tooling
- Performance monitoring 