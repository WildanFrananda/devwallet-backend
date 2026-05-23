FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3-alpine AS builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:1.3-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["bun", "run", "dist/main.js"]