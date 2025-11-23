FROM node:23.3.0-slim

# Install essential dependencies for the build process
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    g++ \
    git \
    make \
    python3 \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*



# Install bun globally with npm
RUN npm install -g bun

# Add bun global bin to PATH for root and node users
ENV PATH="/root/.bun/bin:/home/node/.bun/bin:$PATH"

# Create a wrapper script for elizaos that uses the local installation
RUN echo '#!/bin/bash\nexec /app/node_modules/.bin/elizaos "$@"' > /usr/local/bin/elizaos && \
    chmod +x /usr/local/bin/elizaos

# Set working directory
# Create app directory and set permissions
RUN mkdir -p /app && chown -R node:node /app

# Set working directory
WORKDIR /app

# Switch to non-root user
USER node

# Copy package files (as node user)
COPY --chown=node:node package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy the rest of the application (as node user)
COPY --chown=node:node . .

# Build the application
RUN bun run build

# Create node user's bun directory (if not exists)
RUN mkdir -p /home/node/.bun

# Switch back to root for startup script
USER root

# Environment variables should be provided at runtime (e.g., via docker-compose.yaml)

# Expose port (adjust if needed based on your application)
EXPOSE 3000


# Start the application with permission fix
# Create the .eliza directory and ensure proper ownership before running as node
CMD mkdir -p /app/.eliza && chown -R node:node /app/.eliza && su -s /bin/bash node -c "elizaos start"