# Player Entity Documentation

The Player class represents the user-controlled character, featuring responsive movement and sword combat mechanics.

## Overview

The player entity responds to user input for movement and combat, wielding a sword with unique parameters and maintaining its own health and position state.

## Properties

### Movement Properties
- `speed`: Base movement speed
- `maxSpeed`: Maximum movement speed
- `velocity`: Current movement vector
- `acceleration`: Movement responsiveness
- `friction`: Movement deceleration

### Combat Properties
- `sword`: Player's weapon instance
- `health`: Current health points
- `maxHealth`: Maximum health capacity
- `invulnerableTimer`: Temporary invulnerability after taking damage
- `INVULNERABLE_DURATION`: Length of invulnerability period

## Input Handling

### Movement Controls
- WASD or Arrow Keys for 8-directional movement
- Diagonal movement normalized for consistent speed
- Smooth acceleration and deceleration

### Combat Controls
- Mouse position determines facing direction
- Left click to initiate sword swing
- Movement maintained during attack wind-up

## Combat System

### Sword Combat
```typescript
private updateSword(): void
```
- Updates sword position and rotation
- Handles attack inputs
- Manages sword state and animations

### Damage Handling
```typescript
public takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number): void
```
- Processes incoming damage
- Applies knockback effect
- Triggers invulnerability period
- Updates health display

## Movement System

### Velocity Control
```typescript
private updateMovement(delta: number): void
```
- Processes movement inputs
- Applies acceleration and friction
- Caps speed at maximum
- Handles collision with boundaries

### Mouse Tracking
```typescript
private updateRotation(): void
```
- Rotates player to face mouse cursor
- Updates sword orientation
- Maintains consistent facing during attacks

## Visual Feedback

### Player Sprite
- Triangle shape indicating direction
- Color changes with health/damage
- Alpha pulsing during invulnerability

### Health Display
- Health bar above player
- Updates smoothly with damage
- Shows max and current health

## Initialization

```typescript
constructor(bounds: { width: number; height: number })
```
1. Sets up movement parameters
2. Creates and configures sword
3. Initializes health system
4. Sets up input handlers
5. Creates visual elements

## State Management

### Active States
- `Moving`: Processing movement inputs
- `Attacking`: During sword swing
- `Invulnerable`: After taking damage
- `Dead`: Health depleted

### State Transitions
- Movement state updates every frame
- Attack state managed by sword class
- Invulnerability triggered by damage
- Death state on health depletion

## Usage Example

```typescript
// Create player instance
const player = new Player({ width: 800, height: 600 });

// Main update loop
player.update(delta);

// Handle input
if (keyboard.isDown('W')) {
    player.moveUp();
}

// Mouse interaction
if (mouse.leftButton) {
    player.attack();
}
```

## Customization

The player can be customized through several parameters:

### Movement Feel
- Adjust `speed` and `maxSpeed` for movement range
- Modify `acceleration` for responsiveness
- Change `friction` for momentum

### Combat Balance
- Modify sword parameters for different playstyles
- Adjust health and invulnerability for difficulty
- Change knockback values for combat feel 