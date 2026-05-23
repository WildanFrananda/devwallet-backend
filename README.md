# devwallet-backend

NestJS API + WebSocket gateway for [DevWallet](https://github.com/WildanFrananda) — multi-chain testnet wallet. Serves the mobile client: device auth, faucet orchestration, on-chain webhooks, network config. **Holds no user keys.**

## Stack

NestJS 11 (Fastify) · Bun · TypeORM 0.3 · PostgreSQL 16 · BullMQ + Redis 7 · `ws` gateway · TypeScript strict

## Prerequisites

- Bun 1.3+
- Docker Desktop 4.30+ (min 8 GB RAM allocated)
- macOS / Linux (Windows via WSL2)

## Quick start

```bash
git clone https://github.com/WildanFrananda/devwallet-backend.git
cd devwallet-backend
cp .env.example .env
docker compose up -d postgres redis
bun install
bun run migration:run
bun run start:dev
```

Verify:

```bash
curl -s http://localhost:3000/api/v1/health | jq
# {"status":"ok","db":"up","redis":"up","uptime":...,"timestamp":"..."}
```

WebSocket smoke test:

```bash
bunx wscat -c ws://localhost:3000/ws
> {"event":"ping","data":{"hello":"world"}}
< {"event":"pong","echo":{"hello":"world"},"ts":...}
```

## Useful scripts

| Script | What it does |
|---|---|
| `bun run start:dev` | watch mode (auto-reload on save) |
| `bun run start:prod` | run compiled `dist/main` |
| `bun run build` | `nest build` to `dist/` |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `eslint . --max-warnings=0` |
| `bun run lint:fix` | auto-fix lint |
| `bun run test` | unit tests (jest) |
| `bun run test:e2e` | e2e tests |
| `bun run migration:run` | apply pending migrations |
| `bun run migration:revert` | revert last migration |
| `bun run migration:show` | list applied/pending migrations |

## Docker compose profiles

```bash
docker compose up -d                # postgres + redis (default)
docker compose --profile chain up -d  # + anvil + solana validator
docker compose --profile ui up -d   # + adminer + redisinsight
```

UIs: Adminer at http://localhost:8080 · RedisInsight at http://localhost:5540

## Folder structure

See [CLAUDE.md](CLAUDE.md) for stack details + conventions. Folder layout follows PRD §6.3:

```
src/
  config/                # env validation
  domain/                # entities, repository interfaces (pure TS)
  modules/               # NestJS feature modules (auth, faucet, webhook, ...)
  infrastructure/        # cache, database, queue impls
  shared/                # interceptors, filters, decorators, pipes
  main.ts
```

## License

MIT — see [LICENSE](LICENSE)
