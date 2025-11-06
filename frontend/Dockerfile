# ---- Stage 1: Build ----
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package manifest and lockfile first so Docker can cache dependencies layer
COPY package*.json package-lock.json ./

# Copy Prisma schema BEFORE npm install (postinstall needs it)
COPY prisma ./prisma

# Allow optionally using a nearer registry mirror via build-arg (example: https://registry.npmmirror.com)
ARG NPM_REGISTRY=""
RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi

# Provide DATABASE_URL for Prisma generation during npm install (postinstall hook)
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL

# Increase npm network retry/timeouts to be resilient on flaky networks.
# Use `npm install` (not `npm ci`) here because the lockfile in the repo may not
# exactly match all transient version ranges; `npm install` will ensure required
# dependencies are fetched/added and will update package-lock if needed.
RUN npm config set fetch-retries 5 \
	&& npm config set fetch-retry-maxtimeout 120000 \
	&& npm config set fetch-retry-mintimeout 20000 \
	&& npm install --prefer-offline --no-audit --no-fund --legacy-peer-deps

# Copy rest of the source and build
COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:18-alpine
WORKDIR /app

# Copy only the production manifest and lockfile, then install production deps
COPY package*.json package-lock.json ./

# Copy Prisma schema BEFORE npm install (postinstall needs it)
COPY --from=builder /app/prisma ./prisma

ARG NPM_REGISTRY=""
RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi

# Provide DATABASE_URL for Prisma generation during npm install (postinstall hook)
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL

# Install only production dependencies for the runtime image. Use npm install
# rather than npm ci to avoid ci lockfile mismatch issues during production stage.
RUN npm config set fetch-retries 5 \
	&& npm config set fetch-retry-maxtimeout 120000 \
	&& npm install --only=production --prefer-offline --no-audit --no-fund --legacy-peer-deps

# Copy Next.js's "standalone" output from the builder
# This includes server.js and node_modules needed for runtime
COPY --from=builder /app/.next/standalone ./

# Copy the static assets (CSS, images)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy generated Prisma Client to ensure it's available at runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Expose port 3000 (Next.js default)
EXPOSE 3000

# Run the app
CMD ["node", "server.js"]