# Movement System Documentation

The movement system provides fluid, physics-based motion for all entities in the game, with specialized behaviors for different entity types.

## Core Components

### Velocity System
```typescript
interface Velocity {
    x: number;
    y: number;
}
```

### Movement Parameters
- `speed`: Base movement rate
- `maxSpeed`: Velocity cap
- `acceleration`: Rate of speed change
- `friction`: Rate of deceleration
- `knockbackResistance`: Impact resistance

## Entity-Specific Movement

### Player Movement
1. **Input-Based**
   - WASD/Arrow key controls
   - 8-directional movement
   - Mouse-based rotation
   - Smooth acceleration

2. **Combat Movement**
   - Unrestricted during wind-up
   - Knockback affects movement
   - Invulnerability movement

### Enemy Movement
1. **AI-Driven**
   - Distance-based decisions
   - Target tracking
   - Strategic positioning
   - Optional wind-up movement

2. **States**
   - Chase state
   - Attack position
   - Retreat behavior
   - Stunned movement

## Physics Implementation

### Velocity Application
```typescript
protected applyVelocity(): void {
    // Apply current velocity
    this.x += this.velocity.x;
    this.y += this.velocity.y;

    // Boundary collision
    this.handleBoundaryCollision();

    // Apply friction
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;
}
```

### Collision Response
1. **Boundary Collision**
   - Edge detection
   - Position correction
   - Velocity reflection
   - Radius consideration

2. **Entity Collision**
   - Circle-based detection
   - Overlap resolution
   - Momentum transfer
   - Knockback application

## Movement States

### Active Movement
- Input/AI controlled
- Acceleration-based
- Direction changes
- Speed limiting

### Forced Movement
- Knockback
- Stun recovery
- Wind-up restriction
- Death animation

### Movement Modifiers
- Stun effect
- Invulnerability
- Attack windup
- Environmental effects

## Implementation Details

### Velocity Control
```typescript
private updateVelocity(input: { x: number, y: number }): void {
    // Add input-based acceleration
    this.velocity.x += input.x * this.acceleration;
    this.velocity.y += input.y * this.acceleration;

    // Cap at max speed
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (speed > this.maxSpeed) {
        const scale = this.maxSpeed / speed;
        this.velocity.x *= scale;
        this.velocity.y *= scale;
    }
}
```

### Boundary Handling
```typescript
private handleBoundaryCollision(): void {
    // X-axis bounds
    if (this.x < this.radius) {
        this.x = this.radius;
        this.velocity.x = 0;
    } else if (this.x > this.bounds.width - this.radius) {
        this.x = this.bounds.width - this.radius;
        this.velocity.x = 0;
    }

    // Y-axis bounds
    if (this.y < this.radius) {
        this.y = this.radius;
        this.velocity.y = 0;
    } else if (this.y > this.bounds.height - this.radius) {
        this.y = this.bounds.height - this.radius;
        this.velocity.y = 0;
    }
}
```

## Movement Effects

### Visual Feedback
- Movement animation
- Direction indication
- Speed visualization
- State representation

### Audio Cues
- Movement sounds
- Collision effects
- State transitions
- Environmental interaction

## Customization

### Movement Feel
- Adjust acceleration for responsiveness
- Modify friction for momentum
- Tune max speed for gameplay pace
- Configure knockback for impact feel

### Behavior Patterns
- Custom AI movement patterns
- Special movement states
- Environmental interactions
- Movement abilities

## Usage Examples

### Player Movement
```typescript
// Handle keyboard input
if (keyboard.isDown('W')) moveUp();
if (keyboard.isDown('A')) moveLeft();
if (keyboard.isDown('S')) moveDown();
if (keyboard.isDown('D')) moveRight();

// Handle mouse rotation
const angle = Math.atan2(mouseY - y, mouseX - x);
this.rotation = angle;
```

### Enemy Movement
```typescript
// Distance-based movement
const distance = getDistanceToPlayer();
if (distance > attackRange) {
    moveToward(player);
} else if (distance < retreatRange) {
    moveAway(player);
} else {
    prepareAttack();
}
``` 