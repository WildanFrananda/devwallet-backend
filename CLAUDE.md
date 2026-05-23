# CLAUDE.md — devwallet-backend

## Purpose
NestJS API + WebSocket gateway for DevWallet. Serves the mobile app: device auth, faucet orchestration, webhook listeners, network config. **Does not** hold user private keys — all signing happens on-device.

## Stack
- NestJS 11 + Fastify adapter (not Express)
- Bun runtime + Bun package manager (`bun.lock` is text format, bun 1.2+)
- TypeScript strict
- TypeORM 0.3 + PostgreSQL 16
- BullMQ + ioredis (Redis 7)
- Native `ws` via `@nestjs/platform-ws` (no Socket.IO)
- `class-validator` + `class-transformer` for DTOs
- `@nestjs/config` + Joi env schema validation

See PRD §6.3 for folder structure (must follow exactly). See PRD §8 for DB schema.

## Conventions
- Conventional Commits required (commitlint enforced)
- Clean Architecture: domain/ → modules/ → infrastructure/. **No use case layer** — business logic lives in `*.service.ts`.
- ESLint flat config (`eslint.config.mjs`). Template-aligned with mobile + contracts: double quotes, no semi, no comma-dangle, 120 col, 2-space indent.
- Global `setGlobalPrefix("api/v1")` + `ValidationPipe({ whitelist: true, transform: true })` + `HttpExceptionFilter` registered in `main.ts`
- Database migrations: hand-write per PRD §8. **Never** auto-generate from entities.
- Repositories in `infrastructure/database/repositories/` implement interfaces in `domain/repositories/`.

## Forbidden
- Do not switch to Express. Fastify is the chosen adapter.
- Do not introduce GraphQL / Socket.IO / Prisma / Redux.
- Do not add a use case layer.
- Do not auto-generate TypeORM migrations from entities (PRD anti-pattern).
- Do not store secrets in `.env.example` — that file is committed; real `.env` is git-ignored.
- Do not install packages outside the PRD §7.1 tech stack matrix without asking.
