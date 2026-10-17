# AGENTS.md

Guidance for AI coding agents working in this repo. Keep it terse.

## Read first

- **`CONTEXT.md`**: domain glossary (pt-BR terms plus their code names). Use its terms; its `_Avoid_` lists are binding.
- **`docs/adr/`**: decisions that look surprising without context. Do not "fix" them silently.

## Structure

Turborepo + pnpm (hoisted `node_modules`), mirroring `www/monorepo`.

- `apps/server`: Express 5 + Apollo Server (`/graphql`) + Better Auth (`/api/auth`) + Bot chat (`POST /api/chat/:conversationId`, server-sent events). Bots run in `src/services/bots`: the catalog (`catalog.ts`), what each Bot knows (`context.ts`), its prompt, the chat loop and the Job runner (`jobs.ts`, in-process, ADR 0010). They reach Models only through `src/services/models.ts`, which picks OpenRouter or, in demo mode, the local stand-in (`demoModel.ts`).
- `packages/bots/*`: one package per Bot, with its catalog entry and its pure logic. No I/O there; database and Model calls stay in `apps/server`.
  - `packages/bots/finance` (`@zapbots/finance`): Caishen, the finance Bot. Pure financial math (amortization, Implied Rate, Assessment) with tests; all financial logic lives here.
- `packages/database`: Drizzle schema, migrations (`drizzle/`), lazy `db` client.
- `packages/auth`: Better Auth instance + `resolveViewer(headers)`.
- `packages/graphql`: SDL schema, client operations (`src/operations/*.graphql`), codegen output (`src/generated`, gitignored).
- `packages/client`: React + Vite + Apollo Client 4. Vite proxies `/api` and `/graphql` so every request shares one origin and one session cookie.
  - UI is shadcn/ui on Tailwind v4. Every control or surface (button, input, select, table, card, alert…) is a shadcn component from `src/components/ui`. Add missing ones with `pnpm dlx shadcn@latest add <name>` from `packages/client`, then point their `cn` import at `@/lib/utils`. Never use raw `<button>`/`<input>`/`<select>`/`<table>`.
  - Every screen of a Bot is wrapped in `BotPage`, which puts the Bot's chat (`BotPanel`) beside the content and sets `data-bot`, the attribute that picks the Bot's ink (`text-ink`, `bg-ink`, `border-ink`). Caishen's screens live under `/caishen`.
  - The look is "papel e tinta" (`src/styles.css`): off-white paper, serif titles, mono figures, ruled sections instead of boxes. `Card` is a ruled section, not a box. There is no dark theme.
  - Sign-in is Google only (`authClient.signIn.social`). Needs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. The Google Drive Connection asks for the `drive.file` scope later, on the Conexões page, and its file picker needs `VITE_GOOGLE_API_KEY`/`VITE_GOOGLE_APP_ID`.
  - `DEMO_MODE=true` adds a shared mocked demo User (`packages/auth/src/demo.ts`, a Better Auth plugin: `GET /api/auth/demo`, `POST /api/auth/demo/sign-in`). Dev/demo only.

Workspace packages have no build step: `main` points at `src/index.ts`; apps run with `tsx`.

## Conventions

- Code in English, UI in pt-BR.
- Money is integer cents (`number`, `bigint` in Postgres); rates are monthly effective fractions. Money math uses `decimal.js` in `@zapbots/finance`, never `float` arithmetic (ADR 0004).
- Every query or mutation scopes by `viewer.organizationId`: build the filter with `owned(table, viewer, id?)` from `resolvers/guards.ts`, never by hand, and load a Holder through `findHolder`. The Organization is personal and hidden, and Finanças uses the `viewerHolder` (ADR 0007).
- Bots only read (ADR 0009): no Model tools, nothing written outside zapbots, no money moved. They reach outside tools only through Connections (OAuth), never with stored passwords. Give Models money already formatted.
- A Bot is an entry in `CATALOG` (`services/bots/catalog.ts`) with its name and personality fixed in its package; the `bot` table only stores which Organization has it and its Model (ADR 0010).
- A Job runs in the server process; `createJob` starts it and the client polls `job`. On boot, unfinished Jobs are marked failed.
- A Connection is an entry in `services/connections.ts` (kind, category, status) plus its copy on the Conexões page.
- Changing the GraphQL schema or operations: run `pnpm codegen`.
- Changing the Drizzle schema: run `pnpm db:generate`, then `pnpm db:migrate`.
- Changing scoring rules in `assessment.ts`: bump `ASSESSMENT_MODEL_VERSION`. The scale (0–1000, SPC bands, 4.966 Stages) is fixed by ADR 0005.

## Commands

- `pnpm infra:up`, then `pnpm db:migrate`, then `pnpm dev`: Postgres in Docker, apps on the host.
- `docker compose up --build`: everything in containers.
- `pnpm db:seed`: fills the demo User's Organization with realistic data, dated relative to today. Replaces only that Organization's rows.
- Bots need `OPENROUTER_API_KEY`. Without it, demo mode answers and delivers Jobs with a stand-in Model (no AI; it summarises the data); outside demo mode the Bot panels explain what is missing.
- Server tests (`apps/server/src/__tests__`) use a real Postgres database, `zapbots_test`, created and migrated on demand, so they need `pnpm infra:up`. External APIs are faked with MSW (`apps/server/test/msw`); our own code is not mocked. One test file per feature.
- `pnpm test:unit` · `pnpm lint:tsc` · `pnpm lint`
