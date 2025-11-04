# ---- Stage 1: Build ----
FROM node:18-alpine AS builder

# ---- THIS IS THE CRITICAL STEP ----
# Install FFmpeg from Alpine's package manager
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:18-alpine

# ---- THIS IS THE CRITICAL STEP (AGAIN) ----
# We must also have FFmpeg in our final production image
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

# Copy compiled code from the builder stage
COPY --from=builder /app/dist ./dist

# Command to run the worker
CMD [ "node", "dist/processor.js" ]