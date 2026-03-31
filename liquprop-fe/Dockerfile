# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

# Install bun
RUN npm install -g bun

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile

# Copy source and build
COPY . .

ARG VITE_WALLETCONNECT_PROJECT_ID
ARG VITE_API_BASE_URL
ARG VITE_MAPBOX_TOKEN

ENV VITE_WALLETCONNECT_PROJECT_ID=$VITE_WALLETCONNECT_PROJECT_ID
ENV VITE_API_BASE_URL="https://bnb-liqu-be.talentor.tech"
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

RUN bun run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: send all routes to index.html
RUN printf 'server {\n\
  listen 80;\n\
  location / {\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
