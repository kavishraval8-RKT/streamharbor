# ---- Stage 1: Build ----
# Use an official Node.js image as the base.
# '18-alpine' is a lightweight version.
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy the 'bill of materials' (package.json) first.
# This leverages Docker's layer caching.
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of your source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# ---- Stage 2: Production ----
# Start from a fresh, minimal Node.js image
FROM node:18-alpine

WORKDIR /app

# Copy only the package.json to install *only* production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the compiled JavaScript code from the 'builder' stage
COPY --from=builder /app/dist ./dist

# Expose the port the app will run on
EXPOSE 8080

# The command to run when the container starts
CMD [ "node", "dist/server.js" ]