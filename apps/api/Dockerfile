FROM node:20-alpine AS base
WORKDIR /app
COPY package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN npm install --workspace=@shikhar/api --workspace=@shikhar/shared --workspace=@shikhar/database

COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY apps/api ./apps/api

RUN npm run build --workspace=@shikhar/shared
RUN npm run build --workspace=@shikhar/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=development
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
