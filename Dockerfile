# --- Stage 1: Build Frontend Assets ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies (including devDependencies like Vite)
RUN npm ci

# Copy all source files
COPY . .

# Build Vite client production assets (outputs to /app/dist)
RUN npm run build


# --- Stage 2: Run Production Server ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend server code and dependency specifications
COPY package*.json server.js ./

# Install only production dependencies (saves significant space and memory)
RUN npm ci --only=production

# Cloud Run defaults to port 8080.
# The server will automatically pick up this port via process.env.PORT.
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
