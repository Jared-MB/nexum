# @kristall/nexum

[![Version](https://img.shields.io/npm/v/@kristall/nexum.svg)](https://www.npmjs.com/package/@kristall/nexum)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A TypeScript utility package for Next.js applications, providing essential tools and configurations for building robust web applications.

## Features

- **TypeScript First**: Built with TypeScript for enhanced type safety and developer experience
- **Next.js Integration**: Seamlessly integrates with Next.js applications (v15+)
- **Configuration Management**: Easy configuration handling with `cosmiconfig`
- **Revalidation Utilities**: Tools for managing Next.js ISR (Incremental Static Regeneration)
- **HTTP Utilities**: Common HTTP-related helpers

## Installation

```bash
npm install @kristall/nexum
# or
yarn add @kristall/nexum
# or
pnpm add @kristall/nexum
```

## Usage

### Available Exports

- `@kristall/nexum` - Main package exports
- `@kristall/nexum/revalidation` - Revalidation utilities
- `@kristall/nexum/config` - Configuration types and utilities
- `@kristall/nexum/status` - HTTP status code utilities

## API Reference

### Configuration Options

```typescript
interface NexumConfig {
  // Configuration properties will be documented here
}
```

## Development

### Prerequisites

- Node.js 16+
- pnpm

### Building

```bash
pnpm install
pnpm build
```

### Development Mode

```bash
pnpm dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
