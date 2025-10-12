FROM node:18 AS builder

RUN npm install -g pnpm@8.15.9

WORKDIR /build
COPY ./ ./
RUN pnpm install --frozen-lockfile --filter deepnotes --filter @deepnotes/collab-server...
RUN pnpm --filter @deepnotes/collab-server run bundle

FROM node:18-alpine AS runner

RUN npm install -g pnpm@8.15.9
RUN mkdir /usr/local/pnpm
ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="${PATH}:/usr/local/pnpm"
RUN pnpm add -g pm2

WORKDIR /app
COPY --from=builder /build/apps/collab-server/dist/ ./
RUN pnpm init
RUN pnpm install knex ws pg
CMD ["pm2-runtime", "start", "/app/index.js", "-i", "max"]