# Labyrinth Crawler

A web-based 2D dungeon crawler game featuring procedurally generated dungeons and classic action RPG gameplay. Built with TypeScript and modern web technologies.

## Features

### Core Gameplay
- Top-down 2D action combat
- Room-based dungeon exploration
- Multiple weapons and items
- Enemy AI with various behavior patterns
- Collectable items and upgrades

### Technical Features
- Smooth 60 FPS gameplay
- Pixel-perfect collision detection
- Efficient sprite batching
- Responsive controls
- Cross-browser compatibility

## Tech Stack

### Core Technologies
- TypeScript
- HTML5 Canvas
- WebGL

### Libraries
- **Pixi.js** - High-performance 2D WebGL renderer
- **Matter.js** - 2D physics engine
- **Howler.js** - Audio management

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Project Structure
```
src/
├── Game.ts              # Main game class
├── scenes/             # Game scenes
├── entities/           # Game objects
├── systems/           # Core systems
└── utils/             # Helper utilities
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - See LICENSE file for details 