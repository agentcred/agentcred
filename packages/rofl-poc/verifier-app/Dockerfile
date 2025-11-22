FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build (if using TypeScript)
# RUN npm run build

# Start the verifier
CMD ["npm", "start"]
