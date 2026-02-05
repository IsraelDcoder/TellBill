FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (include devDependencies for build tools)
RUN npm ci

# Copy source code
COPY . .

# Build the server (compile TypeScript with esbuild)
RUN npm run server:build

# ============================================================================
# Stage 2: Runtime
# Minimal production image with only runtime dependencies
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built server from builder stage
COPY --from=builder /app/server_dist ./server_dist

# Copy any static files or templates needed at runtime
COPY --from=builder /app/server/templates ./server/templates

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose API port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server_dist/index.js"]
