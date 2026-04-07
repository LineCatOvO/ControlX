# ControlX Server Build Configuration

**Updated**: 2026-04-05

This document describes the build configuration for the ControlX Server.

---

## Build Environment

### Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ LTS | v24.14.0 recommended |
| pnpm | 10+ | Fast, disk-space efficient |
| TypeScript | 5+ | Strict mode enabled |

### Environment Variables

```bash
# Node.js
export NODE_VERSION=20

# pnpm
npm install -g pnpm
```

---

## Build Commands

### Install Dependencies

```bash
cd Server
pnpm install
```

### Development Build

```bash
pnpm dev
```

**Configuration**:
- TypeScript watch mode
- Source maps enabled
- Hot reload enabled

### Production Build

```bash
pnpm build
```

**Configuration**:
- TypeScript compile to dist/
- Source maps disabled
- Minification enabled (optional)

### Clean Build

```bash
pnpm clean
pnpm build
```

---

## TypeScript Configuration

### tsconfig.json

Key configuration:
- `target: ES2022` - Modern JavaScript features
- `module: NodeNext` - Native ESM support
- `strict: true` - Strict type checking
- `outDir: ./dist` - Output directory
- `rootDir: ./src` - Source directory

### Type Check

```bash
pnpm type-check
```

---

## Environment Configuration

### .env.example

Template file for environment variables:

```bash
# Copy template
cp .env.production.example .env.production

# Edit configuration
nano .env.production
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | WebSocket server port | 8080 |
| WEB_PORT | Health check server port | 8081 |
| NODE_ENV | Environment mode | production |

---

## Package.json Scripts

| Script | Description |
|--------|-------------|
| `dev` | Development mode with watch |
| `build` | Production build |
| `start` | Run production build |
| `test` | Run tests |
| `type-check` | TypeScript type check |
| `lint` | Code linting |
| `clean` | Clean dist directory |

---

## Build Output

### Directory Structure

```
Server/
├── dist/           # Compiled output
│   ├── index.js
│   ├── input/
│   ├── ws/
│   └── ...
├── src/            # Source code
├── tests/          # Test files
└── node_modules/   # Dependencies
```

---

## Verification

### Build Verification

```bash
# 1. Install dependencies
pnpm install

# 2. Run type check
pnpm type-check

# 3. Run build
pnpm build

# 4. Verify output
ls -la dist/

# 5. Run tests
pnpm test

# 6. Run production
node dist/index.js
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| TypeScript errors | Check tsconfig.json strict mode |
| Module not found | Run `pnpm install` |
| Build timeout | Increase Node.js memory |
| Permission denied | Check file permissions |

---

## Production Deployment

### PM2 Configuration

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start dist/index.js --name controlx-server

# Save PM2 config
pm2 save

# Generate startup script
pm2 startup
```

### Docker (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 8080 8081
CMD ["node", "dist/index.js"]
```

---

## References

- [Node.js LTS](https://nodejs.org/)
- [pnpm Documentation](https://pnpm.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)