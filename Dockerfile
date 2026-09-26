# One image for every app; docker-compose.yml picks the command per service.
FROM node:24.13.0-slim

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @mny/graphql codegen

ENV NODE_ENV=production
