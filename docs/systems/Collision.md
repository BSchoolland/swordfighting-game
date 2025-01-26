# Collision System Documentation

The collision system handles all physical interactions between entities in the game, including boundary collisions and combat hit detection.

## Core Components

### Collision Types

#### Circle Collision
```typescript
interface CircleCollider {
    x: number;
    y: number;
    radius: number;
}

function checkCircleCollision(a: CircleCollider, b: CircleCollider): boolean {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (a.radius + b.radius);
}
```

#### Sword Hit Detection
```typescript
interface SwordCollider {
    origin: { x: number, y: number };
    length: number;
    angle: number;
    arc: number;
}

function checkSwordHit(sword: SwordCollider, target: CircleCollider): boolean {
    // Distance check
    const dx = target.x - sword.origin.x;
    const dy = target.y - sword.origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Angle check
    const targetAngle = Math.atan2(dy, dx);
    const angleDiff = normalizeAngle(targetAngle - sword.angle);
    
    return distance <= sword.length && angleDiff <= sword.arc/2;
}
```

## Collision Detection

### Broad Phase
```typescript
class QuadTree {
    private bounds: PIXI.Rectangle;
    private maxObjects: number = 10;
    private objects: Entity[] = [];
    private children: QuadTree[] = [];
    
    public insert(entity: Entity): void {
        if (!this.bounds.contains(entity.x, entity.y)) return;
        
        if (this.objects.length < this.maxObjects) {
            this.objects.push(entity);
        } else {
            this.subdivide();
            this.children.forEach(child => child.insert(entity));
        }
    }
    
    public query(area: PIXI.Rectangle): Entity[] {
        // Return potential collision candidates
    }
}
```

### Narrow Phase
```typescript
function checkDetailedCollision(a: Entity, b: Entity): CollisionResult {
    // Circle collision for entities
    if (a instanceof Entity && b instanceof Entity) {
        return checkCircleCollision(a, b);
    }
    
    // Sword hit detection
    if (a instanceof Sword && b instanceof Entity) {
        return checkSwordHit(a, b);
    }
    
    return null;
}
```

## Collision Response

### Entity Collision
```typescript
function handleEntityCollision(a: Entity, b: Entity): void {
    // Calculate collision normal
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / distance;
    const ny = dy / distance;
    
    // Separate entities
    const overlap = (a.radius + b.radius) - distance;
    const separation = overlap / 2;
    
    a.x -= nx * separation;
    a.y -= ny * separation;
    b.x += nx * separation;
    b.y += ny * separation;
}
```

### Combat Collision
```typescript
function handleCombatCollision(sword: Sword, target: Entity): void {
    // Calculate hit direction
    const hitDir = {
        x: target.x - sword.owner.x,
        y: target.y - sword.owner.y
    };
    const length = Math.sqrt(hitDir.x * hitDir.x + hitDir.y * hitDir.y);
    hitDir.x /= length;
    hitDir.y /= length;
    
    // Apply damage and knockback
    target.takeDamage(sword.damage, hitDir, sword.knockback);
}
```

## Boundary System

### World Boundaries
```typescript
function handleBoundaryCollision(entity: Entity): void {
    // X-axis bounds
    if (entity.x < entity.radius) {
        entity.x = entity.radius;
        entity.velocity.x = 0;
    } else if (entity.x > bounds.width - entity.radius) {
        entity.x = bounds.width - entity.radius;
        entity.velocity.x = 0;
    }
    
    // Y-axis bounds
    if (entity.y < entity.radius) {
        entity.y = entity.radius;
        entity.velocity.y = 0;
    } else if (entity.y > bounds.height - entity.radius) {
        entity.y = bounds.height - entity.radius;
        entity.velocity.y = 0;
    }
}
```

## Optimization Techniques

### Spatial Partitioning
```typescript
class SpatialHash {
    private cellSize: number;
    private cells: Map<string, Entity[]> = new Map();
    
    private getCellKey(x: number, y: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    public insert(entity: Entity): void {
        const key = this.getCellKey(entity.x, entity.y);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key)!.push(entity);
    }
    
    public getPotentialCollisions(entity: Entity): Entity[] {
        const key = this.getCellKey(entity.x, entity.y);
        return this.cells.get(key) || [];
    }
}
```

### Collision Groups
```typescript
enum CollisionLayer {
    PLAYER = 1,
    ENEMY = 2,
    PROJECTILE = 4,
    WALL = 8
}

interface CollisionMask {
    layer: CollisionLayer;
    mask: CollisionLayer;
}

function shouldCheckCollision(a: Entity, b: Entity): boolean {
    return (a.collisionMask.layer & b.collisionMask.mask) !== 0;
}
```

## Debug Visualization

### Collision Shapes
```typescript
function drawCollisionDebug(entity: Entity): void {
    const graphics = new PIXI.Graphics();
    
    // Draw circle collider
    graphics.lineStyle(1, 0x00ff00);
    graphics.drawCircle(entity.x, entity.y, entity.radius);
    
    // Draw sword arc if applicable
    if (entity instanceof Sword) {
        graphics.lineStyle(1, 0xff0000);
        graphics.arc(
            entity.x,
            entity.y,
            entity.length,
            entity.angle - entity.arc/2,
            entity.angle + entity.arc/2
        );
    }
}
```

## Best Practices

### Performance
- Use spatial partitioning
- Implement broad phase collision detection
- Optimize collision checks
- Cache collision results

### Accuracy
- Handle edge cases
- Prevent tunneling
- Maintain consistent collision response
- Consider frame rate independence

### Maintainability
- Clear collision group system
- Debug visualization
- Collision event system
- Flexible collision response 