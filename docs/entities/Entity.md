# Entity Base Class Documentation

The Entity class serves as the base class for all game objects that can move, take damage, and interact with the game world.

## Overview

The Entity class provides core functionality for:
- Health and damage management
- Movement and velocity
- Collision with boundaries
- Knockback mechanics

## Properties

### Core Properties
```typescript
protected bounds: { width: number; height: number }
protected radius: number
protected health: number
protected maxHealth: number
protected velocity: { x: number; y: number }
```

### Health System
- `health`: Current health points
- `maxHealth`: Maximum health capacity
- `isAlive()`: Status check method
- `healthPercentage()`: Returns current health as percentage

### Physics Properties
- `velocity`: Current movement vector
- `radius`: Collision radius
- `bounds`: Game world boundaries
- `position`: Current x,y coordinates (inherited from PIXI.Container)

## Core Methods

### Health Management
```typescript
public takeDamage(amount: number, knockbackDir: { x: number, y: number }, knockbackForce: number): void
```
- Reduces health by amount
- Applies knockback in specified direction
- Triggers death if health reaches 0

### Movement
```typescript
protected applyVelocity(): void
```
- Updates position based on velocity
- Handles boundary collisions
- Applies friction/drag

## Collision System

### Boundary Collision
- Prevents entities from leaving game bounds
- Handles edge bouncing/stopping
- Maintains entity radius distance from edges

### Entity Collision
```typescript
public collidesWith(other: Entity): boolean
```
- Circle-based collision detection
- Uses entity radii for calculations
- Returns true if entities overlap

## Initialization

```typescript
constructor(bounds: { width: number; height: number }, radius: number)
```
1. Sets up game world boundaries
2. Initializes collision radius
3. Sets up health system
4. Initializes velocity vector

## Extension Points

The Entity class is designed to be extended. Key areas for customization:

### Override Points
- `takeDamage()`: Custom damage handling
- `applyVelocity()`: Custom movement physics
- `onDeath()`: Custom death behavior

### Protected Members
- `velocity`: For custom movement implementations
- `health`: For custom health systems
- `bounds`: For custom boundary handling

## Usage Example

```typescript
class CustomEntity extends Entity {
    constructor(bounds: { width: number; height: number }) {
        super(bounds, 30); // 30px radius
    }

    // Custom damage handling
    public takeDamage(amount: number, dir: { x: number, y: number }, force: number): void {
        super.takeDamage(amount, dir, force);
        // Add custom effects
    }

    // Custom movement
    protected applyVelocity(): void {
        super.applyVelocity();
        // Add custom movement behavior
    }
}
``` 