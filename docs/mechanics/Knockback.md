# Knockback System Documentation

The knockback system provides impact-based movement and stun effects, creating dynamic combat interactions between entities.

## Core Components

### Knockback Parameters
```typescript
interface KnockbackEffect {
    direction: { x: number, y: number };  // Normalized vector
    force: number;                        // Magnitude
    duration: number;                     // Stun time
}
```

## Implementation

### Application Process
1. **Initial Impact**
   ```typescript
   public takeDamage(amount: number, dir: { x: number, y: number }, force: number): void {
       this.health -= amount;
       this.velocity.x += dir.x * force;
       this.velocity.y += dir.y * force;
       this.triggerStun();
   }
   ```

2. **Stun Effect**
   ```typescript
   private triggerStun(): void {
       this.stunned = true;
       this.stunTimer = STUN_DURATION;
   }
   ```

3. **Recovery**
   ```typescript
   if (this.stunned) {
       this.stunTimer -= delta;
       if (this.stunTimer <= 0 || speed < KNOCKBACK_THRESHOLD) {
           this.stunned = false;
       }
   }
   ```

## Knockback Sources

### Sword Hits
- Direction based on swing angle
- Force varies by weapon type
- Additional swing influence
- Hit location consideration

### Environmental
- Boundary collisions
- Obstacle impacts
- Area effects
- Trap activation

## Effect Modifiers

### Entity-Specific
- Weight/mass influence
- Resistance values
- Recovery speed
- Stun duration

### State-Based
- Attack interruption
- Movement cancellation
- Action prevention
- Recovery options

## Physics Integration

### Velocity Modification
```typescript
private applyKnockback(dir: { x: number, y: number }, force: number): void {
    // Apply base force
    this.velocity.x += dir.x * force;
    this.velocity.y += dir.y * force;

    // Consider resistance
    const resistance = this.getKnockbackResistance();
    this.velocity.x *= (1 - resistance);
    this.velocity.y *= (1 - resistance);
}
```

### Collision Handling
- Boundary reflection
- Entity interaction
- Momentum preservation
- Friction application

## Visual Feedback

### Impact Effects
- Hit spark/flash
- Direction indicator
- Force visualization
- Stun indication

### Entity Response
- Recoil animation
- Recovery flash
- Stun state
- Movement trail

## Strategic Elements

### Combat Applications
1. **Offensive**
   - Space creation
   - Corner pressure
   - Combo setup
   - Position control

2. **Defensive**
   - Escape option
   - Space maintenance
   - Recovery timing
   - Counter setup

### Environmental Interaction
- Wall bounces
- Corner traps
- Edge guarding
- Safe zones

## Customization

### Parameter Tuning
```typescript
const KNOCKBACK_PARAMS = {
    BASE_FORCE: 5,
    STUN_DURATION: 200,
    RECOVERY_THRESHOLD: 0.5,
    RESISTANCE_FACTOR: 0.2
};
```

### Entity-Specific Settings
```typescript
class Entity {
    protected knockbackResistance: number = 0;
    protected stunDurationMultiplier: number = 1;
    protected recoverySpeed: number = 1;
}
```

## Usage Examples

### Basic Knockback
```typescript
// Apply knockback from sword hit
function onSwordHit(target: Entity, sword: Sword): void {
    const knockbackDir = calculateKnockbackDirection(sword);
    const force = sword.PARAMS.KNOCKBACK;
    target.takeDamage(sword.PARAMS.DAMAGE, knockbackDir, force);
}
```

### Advanced Implementation
```typescript
// Complex knockback with swing influence
function calculateKnockbackDirection(sword: Sword): { x: number, y: number } {
    const baseDir = getDirectionToTarget();
    const swingInfluence = sword.getSwingDirection();
    
    return {
        x: baseDir.x + swingInfluence.x * sword.PARAMS.SWING_INFLUENCE,
        y: baseDir.y + swingInfluence.y * sword.PARAMS.SWING_INFLUENCE
    };
}
```

## Best Practices

### Design Guidelines
1. **Feedback Clarity**
   - Clear visual indicators
   - Consistent behavior
   - Predictable recovery
   - Readable states

2. **Game Feel**
   - Impactful effects
   - Smooth transitions
   - Fair recovery
   - Strategic depth

3. **Balance Considerations**
   - Risk/reward ratio
   - Recovery options
   - Combo potential
   - Position control 