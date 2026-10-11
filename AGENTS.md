# AGENTS.md

Guidance for AI coding agents working in this repo. Keep it terse.

## Read first

- **`CONTEXT.md`**: domain glossary (pt-BR terms plus their code names). Use its terms; its `_Avoid_` lists are binding.
- **`docs/adr/`**: decisions that look surprising without context. Do not "fix" them silently.

## Structure

Turborepo + pnpm (hoisted `node_modules`), mirroring `www/monorepo`.

- `apps/server`: Express 5 + Apollo Server (`/graphql`) + Better Auth (`/api/auth`) + Buddy chat (`POST /api/chat/:conversationId`, server-sent events). Buddies live in `src/services/buddies` (context per Area, Actions, chat loop) and reach Models only through `src/services/models.ts`, which picks OpenRouter or, in demo mode, the local stand-in (`demoModel.ts`).
- `apps/collab`: Hocuspocus; persists each Note's Yjs state in `note.content`. Documents are named `note:<uuid>`.
- `packages/finance`: pure financial math (amortization, Implied Rate, Assessment). No I/O. All financial logic with tests lives here; other Areas keep small pure functions with tests next to their service in `apps/server/src/services`.
- `packages/database`: Drizzle schema, migrations (`drizzle/`), lazy `db` client.
- `packages/auth`: Better Auth instance + `resolveViewer(headers)`, shared by server and collab.
- `packages/graphql`: SDL schema, client operations (`src/operations/*.graphql`), codegen output (`src/generated`, gitignored).
- `packages/client`: React + Vite + Apollo Client 4 + Tiptap. Vite proxies `/api`, `/graphql` and `/collab` so every request shares one origin and one session cookie.
  - UI is shadcn/ui on Tailwind v4. Every control or surface (button, input, select, table, card, alert…) is a shadcn component from `src/components/ui`. Add missing ones with `pnpm dlx shadcn@latest add <name>` from `packages/client`, then point their `cn` import at `@/lib/utils`. Never use raw `<button>`/`<input>`/`<select>`/`<table>`.
  - Every Area screen is wrapped in `AreaPage`, which puts the Area's Buddy (`BuddyPanel`) beside the content and sets `data-area`, the attribute that picks the Area's ink (`text-ink`, `bg-ink`, `border-ink`).
  - The look is "papel e tinta" (`src/styles.css`): off-white paper, serif titles, mono figures, ruled sections instead of boxes. `Card` is a ruled section, not a box. There is no dark theme.
  - Sign-in is Google only (`authClient.signIn.social`). Needs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. The Google Drive Connection asks for the `drive.file` scope later, on the Conexões page, and its file picker needs `VITE_GOOGLE_API_KEY`/`VITE_GOOGLE_APP_ID`.
  - `DEMO_MODE=true` adds a shared mocked demo User (`packages/auth/src/demo.ts`, a Better Auth plugin: `GET /api/auth/demo`, `POST /api/auth/demo/sign-in`). Dev/demo only.

Workspace packages have no build step: `main` points at `src/index.ts`; apps run with `tsx`.

## Conventions

- Code in English, UI in pt-BR.
- Money is integer cents (`number`, `bigint` in Postgres); rates are monthly effective fractions. Money math uses `decimal.js` in `@mny/finance`, never `float` arithmetic (ADR 0004).
- Every query or mutation scopes by `viewer.organizationId`; load a Holder through `findHolder` to enforce it. The Organization is personal and hidden, and Finanças uses the `viewerHolder` (ADR 0007).
- Buddy Actions are only simple and reversible (create Task, log Workout, create Note). Never add a tool that touches Obligations or amounts, and give Models money already formatted (ADR 0008).
- A Note's `content` is Yjs state. Write it on the server only through `services/noteContent.ts`.
- Changing the GraphQL schema or operations: run `pnpm codegen`.
- Changing the Drizzle schema: run `pnpm db:generate`, then `pnpm db:migrate`.
- Changing scoring rules in `assessment.ts`: bump `ASSESSMENT_MODEL_VERSION`. The scale (0–1000, SPC bands, 4.966 Stages) is fixed by ADR 0005.

## Commands

- `pnpm infra:up`, then `pnpm db:migrate`, then `pnpm dev`: Postgres in Docker, apps on the host.
- `docker compose up --build`: everything in containers.
- `pnpm db:seed`: fills the demo User's Organization with realistic data, dated relative to today. Replaces only that Organization's rows.
- Buddies need `OPENROUTER_API_KEY`. Without it, demo mode answers with a stand-in Model (no AI; it summarises the data and runs Actions on plain requests like "crie uma tarefa para…"); outside demo mode the Buddy panels explain what is missing.
- `pnpm test:unit` · `pnpm lint:tsc` · `pnpm lint`
