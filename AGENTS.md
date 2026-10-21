# AGENTS.md

Guidance for AI coding agents working in this repo. Keep it terse.

## Read first

- **`CONTEXT.md`**: domain glossary (pt-BR terms plus their code names). Use its terms; its `_Avoid_` lists are binding.
- **`docs/adr/`**: decisions that look surprising without context. Do not "fix" them silently.

## Structure

Turborepo + pnpm (hoisted `node_modules`), mirroring `www/monorepo`.

- `apps/server`: Express 5 + Apollo Server (`/graphql`) + Better Auth (`/api/auth`) + Bot chat (`POST /api/chat/:conversationId`, server-sent events). Bots run in `src/services/bots`: the catalog (`catalog.ts`), what each Bot knows (`context.ts`), its prompt, the chat loop and the Job runner (`jobs.ts`, in-process, ADR 0010). They reach Models only through `src/services/models.ts`, which serves them from OpenRouter.
- `packages/bots/*`: one package per Bot, with its catalog entry and its pure logic. No I/O there; database and Model calls stay in `apps/server`.
  - `packages/bots/finance` (`@zapbots/finance`): Caishen, the finance Bot. Pure financial math (amortization, Implied Rate, Assessment) with tests; all financial logic lives here.
- `packages/database`: Drizzle schema, migrations (`drizzle/`), lazy `db` client.
- `packages/auth`: Better Auth instance + `resolveViewer(headers)`.
- `packages/graphql`: SDL schema, client operations (`src/operations/*.graphql`), codegen output (`src/generated`, gitignored).
- `packages/client`: React + Vite + Apollo Client 4. Vite proxies `/api` and `/graphql` so every request shares one origin and one session cookie.
  - UI is shadcn/ui on Tailwind v4. Every control or surface (button, input, select, table, card, alert…) is a shadcn component from `src/components/ui`. Add missing ones with `pnpm dlx shadcn@latest add <name>` from `packages/client`, then point their `cn` import at `@/lib/utils`. Never use raw `<button>`/`<input>`/`<select>`/`<table>`.
  - Layout (`Layout`): the dark rail on the left (`Rail`: the Caishen's mark on top, then Dashboard, Agente and Documentos (Workflows are hidden until they work: `/workflows` redirects home), then the Caishen's pages (`/caishen`) and Integrações, the avatar menu with Perfil, Plano, Organização and Sair at the bottom), a top bar (`TopBar`: where you are, and the button that opens the chat), the screen, and the chat panel (`ChatPanel`, a `BotPanel` docked on the right, animated with `motion`) beside it. Every path is in English: Dashboard `/`, Agente `/chat` (a page only for the chat, with its own column of Conversations and nothing else; the panel stays closed there), Workflows `/workflows` and `/workflows/:id` (the UI name of Jobs; code keeps `Job`), Documentos `/documents` (Entregas and Anexos in one table, `documents` query) and `/documents/:id` (an Entrega in a Tiptap editor, `@tiptap/markdown`; edits autosave through `editDeliverable`, the Bot's original is kept), `/caishen/*`, `/integrations/:group`, `/integrations/models`, `/organization`, `/plan`, `/profile`, `/sign-in`.
  - Each working Bot has a page (`BotLayout`, e.g. `/caishen`) with tabs from `BOT_SECTIONS` in `lib/bots.ts` (Visão geral, and Financeiro `/caishen/finances` with Salário, Impostos and Obrigações as parts of one page, `#income`, `#taxes`, `#obligations`); the chat is not a tab; Conversations start from the floating "+". `data-bot` picks the Bot's ink (`text-ink`, `bg-ink`, `border-ink`). `TEAM` lists only Bots that work; there are no "coming soon" Bots.
  - Integrações is a group of the menu on the left, like the Caishen's: Modelos (`/integrations/models`, the Model of each Bot), then one item per category of `INTEGRATION_GROUPS` (`/integrations/:group`). There are no Configurações: Organização (name and Users), Plano (billing and usage) and Perfil (name, language) are pages of their own.
  - UI strings go through `useI18n().t(key)` (`lib/i18n.tsx`, pt and en; signed in, the language is the User's `language` field, set on Perfil; before that, per browser, Portuguese by default). Screens not moved there yet are pt-BR only; new strings go in the dictionary.
  - The look (`src/styles.css`): the original Caishen's paper `#fffaf4` and ink `#1e1a17`, a darker rail, Inter everywhere, tabular figures, and `.page-enter` (a short fade sliding down) on each page container keyed by path. There is no dark theme.
  - Sign-in has no password: a link sent by email (`authClient.signIn.magicLink`, Better Auth's `magicLink` plugin; sent through Resend when `RESEND_API_KEY` is set; otherwise printed on the server console and, when `CLIENT_ORIGIN` is localhost, handed back to the page by `POST /api/auth/sign-in/local-link`) and Google (`authClient.signIn.social`), offered only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set. `GET /api/auth/sign-in-methods` tells the page which are on. The Google Drive Connection asks for the `drive.file` scope later, on the Integrações page, and its file picker needs `VITE_GOOGLE_API_KEY`/`VITE_GOOGLE_APP_ID`.
  - Billing (ADR 0011): Plans and Limits in `services/billing/plans.ts`, Stripe over REST in `services/billing/stripe.ts` (Checkout, portal, webhook at `POST /api/billing/webhook`, raw body, signature checked, events deduped). Needs `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`. Jobs, Routines and chat Messages pass `requireWithinLimit`. Usage codes are created with `pnpm usage-code`.

Workspace packages have no build step: `main` points at `src/index.ts`; apps run with `tsx`. Production is one Vercel project with two Services, `client` and `server` (`vercel.json`, ADR 0012): `apps/server/src/app.ts` is the Express app, `index.ts` the long-lived process around it.

## Conventions

- Code in English, UI in pt-BR.
- Money is integer cents (`number`, `bigint` in Postgres); rates are monthly effective fractions. Money math uses `decimal.js` in `@zapbots/finance`, never `float` arithmetic (ADR 0004).
- Every query or mutation scopes by `viewer.organizationId`: build the filter with `owned(table, viewer, id?)` from `resolvers/guards.ts`, never by hand, and load a Holder through `findHolder`. The Organization is personal and has its own page; changing it takes `requireAdmin`. Finanças uses the `viewerHolder` (ADR 0007).
- Bots only read (ADR 0009): no Model tools, nothing written outside zapbots, no money moved. They reach outside tools only through Connections (OAuth), never with stored passwords. Give Models money already formatted.
- A Bot is an entry in `CATALOG` (`services/bots/catalog.ts`) with its name and personality fixed in its package; the `bot` table only stores which Organization has it and its Model (ADR 0010).
- A Job runs in the server process; `createJob` starts it and the client polls `job`. On boot, unfinished Jobs are marked failed; on Vercel, `failStaleJobs` does it to Jobs past their function's time limit (ADR 0012). Hand Jobs over only through `handOverJob` (`services/bots/jobs.ts`); requests from Users also pass `requireRoom` (at most 3 Jobs in progress per Organization).
- A Routine hands the same Job over every week or month; `startRoutineClock` checks once a minute in the server process (ADR 0010); on Vercel a daily Cron Job calls `/api/cron/routines` instead (ADR 0012).
- A Connection is an entry in `services/connections.ts` (kind, category, status) plus its copy on the Integrações page.
- Changing the GraphQL schema or operations: run `pnpm codegen`.
- Changing the Drizzle schema: run `pnpm db:generate`, then `pnpm db:migrate`.
- Changing scoring rules in `assessment.ts`: bump `ASSESSMENT_MODEL_VERSION`. The scale (0–1000, SPC bands, 4.966 Stages) is fixed by ADR 0005.

## Commands

- `pnpm tui` (`scripts/tui.mts`): `.env`, Docker, install, Postgres, migrations and codegen, then server and client in one screen (`--skip-install`). See `docs/local-development.md`.
- `pnpm infra:up`, then `pnpm db:migrate`, then `pnpm dev`: Postgres in Docker, apps on the host.
- `docker compose up --build`: everything in containers.
- Bots need `OPENROUTER_API_KEY`. Without it the Bot panels explain what is missing.
- Server tests (`apps/server/src/__tests__`) use a real Postgres database, `zapbots_test`, created and migrated on demand, so they need `pnpm infra:up`. External APIs are faked with MSW (`apps/server/test/msw`); our own code is not mocked. One test file per feature.
- `pnpm test:unit` · `pnpm lint:tsc` · `pnpm lint`
