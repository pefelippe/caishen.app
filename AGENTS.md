# AGENTS.md

Guidance for AI coding agents working in this repo. Keep it terse.

## Read first

- **`CONTEXT.md`**: domain glossary (pt-BR terms plus their code names). Use its terms; its `_Avoid_` lists are binding.
- **`docs/adr/`**: decisions that look surprising without context. Do not "fix" them silently.

## Structure

Turborepo + pnpm (hoisted `node_modules`), mirroring `www/monorepo`.

- `apps/server`: Express 5 + Apollo Server (`/graphql`) + Better Auth (`/api/auth`).
- `apps/collab`: Hocuspocus; persists each Note's Yjs state in `note.content`. Documents are named `note:<uuid>`.
- `packages/finance`: pure financial math (amortization, Implied Rate, Assessment). No I/O. All domain logic with tests lives here.
- `packages/database`: Drizzle schema, migrations (`drizzle/`), lazy `db` client.
- `packages/auth`: Better Auth instance + `resolveViewer(headers)`, shared by server and collab.
- `packages/graphql`: SDL schema, client operations (`src/operations/*.graphql`), codegen output (`src/generated`, gitignored).
- `packages/client`: React + Vite + Apollo Client 4 + Tiptap. Vite proxies `/api`, `/graphql` and `/collab` so every request shares one origin and one session cookie.

Workspace packages have no build step: `main` points at `src/index.ts`; apps run with `tsx`.

## Conventions

- Code in English, UI in pt-BR.
- Money is integer cents (`number`, `bigint` in Postgres); rates are monthly effective fractions. Money math uses `decimal.js` in `@mny/finance`, never `float` arithmetic (ADR 0004).
- Every query or mutation scopes by `viewer.organizationId`; load a Holder through `findHolder` to enforce it.
- Changing the GraphQL schema or operations: run `pnpm codegen`.
- Changing the Drizzle schema: run `pnpm db:generate`, then `pnpm db:migrate`.
- Changing scoring rules in `assessment.ts`: bump `ASSESSMENT_MODEL_VERSION`. The scale (0–1000, SPC bands, 4.966 Stages) is fixed by ADR 0005.

## Commands

- `pnpm infra:up`, then `pnpm db:migrate`, then `pnpm dev`: Postgres in Docker, apps on the host.
- `docker compose up --build`: everything in containers.
- `pnpm test:unit` · `pnpm lint:tsc` · `pnpm lint`
