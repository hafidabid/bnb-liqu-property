# Task 01 — Project Setup

## Goal
Bootstrap the LiquProp frontend from an empty repo.

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS v3 + shadcn/ui (slate, CSS variables)
- RainbowKit + wagmi v2 + viem v2
- Package manager: bun
- Docker: multi-stage build (node:18-alpine → nginx)

## Tasks

- [x] Scaffold Vite + React + TS project (`package.json`, `vite.config.ts`, `tsconfig.json`)
- [x] Configure Tailwind CSS (`tailwind.config.ts`, `postcss.config.js`, `src/index.css`)
- [x] Add shadcn/ui config (`components.json`, CSS variables, `src/lib/utils.ts`)
- [x] Wire up wagmi + RainbowKit (`src/lib/wagmi.ts`, `src/providers/Web3Provider.tsx`)
- [x] Create app entry (`src/main.tsx`, `src/App.tsx` with ConnectButton)
- [x] Add Docker support (`Dockerfile`, `docker-compose.yml`, `.dockerignore`)
- [x] Add support files (`.gitignore`, `.env.example`)
- [x] Create tasks folder structure

## Verification
```bash
bun install
bun run dev        # → http://localhost:5173
docker compose up  # → http://localhost:5173 (hot-reload)
docker build -t liquprop-fe .  # production build
```
