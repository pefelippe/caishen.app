# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js frontend (standalone output).
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- deps: install workspace dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
COPY packages/theme/package.json packages/theme/
COPY packages/services/package.json packages/services/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

# ---- builder: build the web app ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @caishen/web build

# ---- runner: minimal standalone server ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
