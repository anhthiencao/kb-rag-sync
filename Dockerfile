# --- build stage: compile TypeScript -> dist ---
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# --- runtime stage: production deps + compiled JS only ---
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# Runs once and exits 0 (delta upload). Override with --scrape-only / --dry-run.
ENTRYPOINT ["node", "dist/main.js"]
