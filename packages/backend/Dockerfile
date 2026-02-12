# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@4hclub/backend --workspace=@4hclub/shared

# Copy root tsconfig (needed by shared package)
COPY tsconfig.json ./tsconfig.json

# Copy shared package and build it
COPY packages/shared ./packages/shared
RUN npm run build --workspace=@4hclub/shared

# Copy backend source
COPY packages/backend ./packages/backend

# Build backend (if you add a build step later)
# RUN npm run build --workspace=@4hclub/backend

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --workspace=@4hclub/backend --workspace=@4hclub/shared --omit=dev

# Copy built shared package from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY packages/shared/package.json ./packages/shared/

# Copy root tsconfig (backend tsconfig extends it)
COPY tsconfig.json ./tsconfig.json

# Copy backend source and migrations
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/migrations ./packages/backend/migrations
COPY packages/backend/tsconfig.json ./packages/backend/

# Install ts-node locally for running TypeScript in production
WORKDIR /app/packages/backend
RUN npm install ts-node typescript --save

# Expose port (Cloud Run sets PORT env variable dynamically)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "-r", "ts-node/register", "src/index.ts"]
