# UNI Events - Dockerfile for containerized deployment
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install Oracle Instant Client dependencies
RUN apk add --no-cache libaio libnsl libc6-compat curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p data/uploads/events

# Expose port
EXPOSE 4400

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]

