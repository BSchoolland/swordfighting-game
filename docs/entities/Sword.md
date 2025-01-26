# Sword Entity Documentation

The Sword class represents a melee weapon that can be wielded by both players and enemies, featuring different configurations for each.

## Overview

The sword is a dynamic weapon that includes wind-up animations, swing mechanics, and hit detection. It supports different configurations for players and enemies, allowing for balanced but distinct combat experiences.

## Parameters

### Player Sword Parameters
```typescript
PLAYER_PARAMS = {
    SWING_SPEED: 0.3,
    SWING_RANGE: Math.PI * 1.5,  // 270 degrees
    DAMAGE: 15,
    KNOCKBACK: 5,
    COOLDOWN: 1000,              // 1 second
    BLADE_LENGTH: 60,
    BLADE_WIDTH: 4,
    SWING_INFLUENCE: 0.5,
    COLOR: 0xFFFFFF,
    OPTIMAL_RANGE: 0.8,
    RETREAT_RANGE: 0.6,
    WIND_UP_TIME: 100,           // 100ms
    PREVIEW_ALPHA: 0.4
}
```

### Enemy Sword Parameters
```typescript
ENEMY_PARAMS = {
    SWING_SPEED: 0.2,
    SWING_RANGE: Math.PI * 1.2,
    DAMAGE: 10,
    KNOCKBACK: 3,
    COOLDOWN: 2000,              // 2 seconds
    BLADE_LENGTH: 40,
    BLADE_WIDTH: 3,
    SWING_INFLUENCE: 0.3,
    COLOR: 0xFF6666,
    OPTIMAL_RANGE: 0.9,
    RETREAT_RANGE: 0.7,
    WIND_UP_TIME: 300,           // 300ms
    PREVIEW_ALPHA: 0.3
}
```

## States

### 1. Idle State
- Default state
- Sword is invisible
- Can transition to Wind-up state if cooldown has expired

### 2. Wind-up State
- Activated when swing is initiated
- Shows preview sprite
- Duration determined by `WIND_UP_TIME`
- Cannot be canceled (but owner can be knocked back)

### 3. Swinging State
- Follows wind-up completion
- Sword becomes visible
- Rotates through `SWING_RANGE` at `SWING_SPEED`
- Checks for hits during rotation

## Combat Mechanics

### Hit Detection
```typescript
private checkHits(targets: Entity[]): void
```
- Checks distance between sword and potential targets
- Ignores owner and already-hit entities
- Applies damage and knockback on hit
- Considers swing angle for knockback direction

### Swing Mechanics
```typescript
public swing(): void
```
- Initiates attack sequence
- Checks cooldown
- Triggers wind-up animation
- Manages state transitions

### Range Calculation
```typescript
public getRange(): { attackRange: number, retreatRange: number }
```
- Provides optimal attack and retreat ranges
- Used by entities for positioning
- Based on blade length and range multipliers

## Visual System

### Main Sword Sprite
- Visible during swing
- Full opacity
- Colored based on owner type

### Preview Sprite
- Visible during wind-up
- Reduced opacity (`PREVIEW_ALPHA`)
- Shows intended swing start position

## Usage Example

```typescript
// Create a player sword
const playerSword = new Sword(playerEntity, false);

// Create an enemy sword
const enemySword = new Sword(enemyEntity, true);

// Update loop
sword.update(delta, targetEntities);

// Attempt to swing
sword.swing();

// Check if currently winding up
if (sword.isInWindUp()) {
    // Handle wind-up state
}
```

## Customization

The sword system is designed to be easily customizable through its parameters. All aspects of the sword's behavior can be modified by adjusting the corresponding parameter values:

- Combat feel: Adjust `SWING_SPEED`, `SWING_RANGE`, and `WIND_UP_TIME`
- Balance: Modify `DAMAGE`, `KNOCKBACK`, and `COOLDOWN`
- Visual style: Change `COLOR`, `BLADE_LENGTH`, and `PREVIEW_ALPHA` 