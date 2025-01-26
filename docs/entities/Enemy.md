# Enemy Entity Documentation

The Enemy class represents hostile entities that actively pursue and engage the player in combat using swords.

## Overview

Enemies are autonomous entities that use a sophisticated AI system to chase, attack, and retreat based on their distance to the player and weapon range.

## Properties

### Core Properties
- `speed`: Base movement speed (default: 0.5)
- `maxSpeed`: Maximum movement speed (default: 2)
- `CHASE_RANGE`: Maximum distance to start pursuing player (250 units)
- `attackRange`: Optimal distance for attacking (derived from sword parameters)
- `retreatRange`: Distance at which to start retreating (derived from sword parameters)

### Combat Properties
- `sword`: Weapon instance used for attacking
- `stunned`: Current stun state
- `stunTimer`: Remaining stun duration
- `STUN_DURATION`: Length of stun effect (200ms)
- `KNOCKBACK_THRESHOLD`: Minimum speed to maintain knockback (0.5)
- `canMoveWhileWindingUp`: Whether the enemy can move during sword wind-up

## Behavior States

### 1. Chase State
- Activates when player is within `CHASE_RANGE` but beyond `attackRange`
- Enemy moves toward player at `speed`
- Movement is capped at `maxSpeed`

### 2. Attack State
- Activates when player is between `retreatRange` and `attackRange`
- Enemy slows down (velocity *= 0.8)
- Initiates sword swing with wind-up animation
- Faces player continuously

### 3. Retreat State
- Activates when player is closer than `retreatRange`
- Enemy moves away at increased speed (speed * 1.2)
- Maintains facing toward player

### 4. Stunned State
- Activated when taking damage
- Movement is restricted
- Lasts for `STUN_DURATION` or until speed drops below `KNOCKBACK_THRESHOLD`

## Combat System

### Sword Usage
- Equipped with an enemy-specific sword configuration
- Includes wind-up animation before strikes
- Can optionally move during wind-up based on `canMoveWhileWindingUp`

### Damage and Knockback
```typescript
takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number)
```
- Applies damage to health
- Triggers stun state
- Applies knockback force in specified direction

## Movement System

### Velocity Control
- Additive acceleration toward target position
- Velocity capping at `maxSpeed`
- Gradual deceleration when outside chase range (0.95 factor)
- Complete stop during wind-up (if `canMoveWhileWindingUp` is false)

### Position Updates
```typescript
applyVelocity()
```
- Updates position based on current velocity
- Handles collision with boundaries
- Applies knockback effects

## Initialization

```typescript
constructor(bounds: { width: number; height: number }, player: Player, canMoveWhileWindingUp: boolean = false)
```

1. Spawns at random position within bounds
2. Ensures minimum spawn distance from player (150 units)
3. Creates and configures sword
4. Initializes movement and combat parameters
5. Sets up visual representation

## Usage Example

```typescript
// Create an enemy that must stand still while attacking
const standardEnemy = new Enemy(gameBounds, player, false);

// Create an enemy that can move while winding up attacks
const agileEnemy = new Enemy(gameBounds, player, true);
``` 