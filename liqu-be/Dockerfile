FROM node:20-alpine

WORKDIR /app

RUN npm install -g bun

COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

EXPOSE 8000

CMD ["node", "dist/index.js"]
