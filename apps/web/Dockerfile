FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=@shikhar/web --workspace=@shikhar/shared

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build --workspace=@shikhar/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "apps/web/node_modules/.bin/next", "start", "apps/web", "-p", "3001"]
