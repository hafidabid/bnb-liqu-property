FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Ponder uses port 42069 by default for its GraphQL/API server
EXPOSE 42069

CMD ["npm", "run", "start"]
