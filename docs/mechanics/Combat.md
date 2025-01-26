# Combat System Documentation

The combat system is built around melee combat using swords, featuring wind-up animations, knockback, and strategic positioning.

## Core Mechanics

### Attack Sequence
1. **Wind-up Phase**
   - Visual telegraph with preview sprite
   - Configurable duration
   - Movement restrictions (optional)
   - Can be interrupted by knockback

2. **Swing Phase**
   - Active damage window
   - Arc-based hit detection
   - Knockback application
   - Single-hit per target per swing

3. **Recovery Phase**
   - Cooldown period
   - Movement restored
   - Preparing for next attack

## Damage System

### Components
```typescript
interface DamageApplication {
    amount: number;
    knockbackDir: { x: number, y: number };
    knockbackForce: number;
}
```

### Damage Types
1. **Direct Damage**
   - Reduces health
   - Instant application
   - Can be fatal

2. **Knockback**
   - Direction vector
   - Force magnitude
   - Velocity-based resolution

3. **Stun Effect**
   - Duration-based
   - Movement restriction
   - Early recovery possible

## Strategic Elements

### Positioning
- Optimal attack ranges
- Retreat distances
- Chase thresholds
- Movement during combat

### Timing
- Attack wind-up timing
- Cooldown management
- Stun duration
- Invulnerability frames

### Space Control
- Sword arc coverage
- Knockback manipulation
- Zone control
- Corner trapping

## Combat Interactions

### Player vs Enemy
1. **Offensive**
   - Player initiates with mouse click
   - Longer range, higher damage
   - Faster wind-up
   - Wider arc

2. **Defensive**
   - Invulnerability after hits
   - Knockback for spacing
   - Movement during wind-up

### Enemy vs Player
1. **Offensive**
   - Range-based initiation
   - Shorter range, lower damage
   - Longer wind-up
   - Narrower arc

2. **Defensive**
   - Stun on hit
   - Strategic retreat
   - Optional movement during wind-up

## Visual Feedback

### Attack Indicators
- Sword preview during wind-up
- Swing arc visualization
- Hit effects
- Damage numbers

### State Indicators
- Health bars
- Stun visualization
- Invulnerability flashing
- Death animation

## Balance Parameters

### Player Sword
```typescript
{
    SWING_SPEED: 0.3,
    SWING_RANGE: Math.PI * 1.5,
    DAMAGE: 15,
    KNOCKBACK: 5,
    COOLDOWN: 1000,
    WIND_UP_TIME: 100
}
```

### Enemy Sword
```typescript
{
    SWING_SPEED: 0.2,
    SWING_RANGE: Math.PI * 1.2,
    DAMAGE: 10,
    KNOCKBACK: 3,
    COOLDOWN: 2000,
    WIND_UP_TIME: 300
}
```

## Combat Flow Example

```typescript
// Attack initiation
sword.swing();

// Wind-up phase
if (sword.isInWindUp()) {
    showPreview();
    restrictMovement();
}

// Swing phase
if (sword.isSwinging) {
    checkHits();
    applyDamage();
    triggerKnockback();
}

// Hit resolution
function onHit(target) {
    target.takeDamage(damage, knockbackDir, force);
    target.triggerStun();
    showHitEffect();
}
```

## Customization Guide

### Tuning Combat Feel
- Adjust wind-up times for different difficulty
- Modify swing speeds for combat pacing
- Balance damage and knockback for intensity
- Configure cooldowns for attack frequency

### Creating Variations
- Different sword configurations
- Custom attack patterns
- Unique enemy behaviors
- Special attack types 