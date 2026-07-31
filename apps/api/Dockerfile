# syntax=docker/dockerfile:1
# Multi-stage build for the Express backend.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @caishen/api build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/types ./packages/types
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
