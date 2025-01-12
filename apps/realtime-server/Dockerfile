FROM node:16 AS builder

RUN npm install -g pnpm@^8.0.0

WORKDIR /build
COPY ./ ./
RUN pnpm install --filter deepnotes --filter @deepnotes/realtime-server...
RUN pnpm --filter @deepnotes/realtime-server run bundle

FROM node:16-alpine AS runner

RUN npm install -g pnpm@^8.0.0
RUN mkdir /usr/local/pnpm
ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="${PATH}:/usr/local/pnpm"
RUN pnpm add -g pm2

WORKDIR /app
COPY --from=builder /build/apps/realtime-server/dist/ ./
RUN pnpm init
RUN pnpm install knex ws pg
CMD pm2 start /app/index.js -i max && pm2 logs