# Optimized for Railway's Railpack
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.yaml ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Railway will set the PORT and start command
# No need to expose or define CMD here
