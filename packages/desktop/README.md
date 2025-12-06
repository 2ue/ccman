# @ccman/desktop

Desktop GUI application for managing Codex, Claude Code, Gemini CLI, and MCP API service provider configurations.

## Tech Stack

- **Framework**: Electron ^28.0
- **UI**: React ^18.2 + Tailwind CSS ^3.4
- **Icons**: Lucide React
- **Build**: Vite ^5.0 + electron-builder ^24.0
- **Core Logic**: @ccman/core (100% code reuse)

## Architecture

### Main Process
- Direct import from `@ccman/core`
- IPC handlers for all provider operations
- Window lifecycle management

### Preload Script
- `contextBridge` API exposure
- Security isolation (contextIsolation + nodeIntegration: false)

### Renderer Process
- React components with Tailwind CSS
- Lucide icons for UI elements

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build
pnpm build

# Package for distribution
pnpm build:electron
```

## Features

### Current Status Display
- Shows active provider
- Provider type badge (Codex/Claude/Gemini)
- Base URL and ID information
- MCP server status

### Provider List
- View all configured providers
- Switch between providers
- Edit provider details
- Delete providers
- Clone providers

### Add/Edit Form
- Preset templates selection
- Custom configuration
- Form validation
- Interactive UI

## Security

- Context isolation enabled
- Node integration disabled
- Preload script for safe API exposure
- No direct Node.js access in renderer

## Build Output

- `dist/main` - Electron main process
- `dist/preload` - Preload script
- `dist/renderer` - React UI bundle
- `release/` - Packaged applications (dmg/exe/AppImage)

## License

MIT
