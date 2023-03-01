FROM node:16 AS builder

RUN npm install -g pnpm

WORKDIR /build
COPY ./ ./
RUN pnpm install --filter deepnotes --filter deepnotes-app-server...
RUN pnpm --filter deepnotes-app-server... run build
RUN pnpm --filter deepnotes-app-server run bundle

FROM node:16-alpine AS runner

RUN npm install -g pnpm
RUN mkdir /usr/local/pnpm
ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="${PATH}:/usr/local/pnpm"
RUN pnpm add -g pm2

WORKDIR /app
COPY --from=builder /build/apps/app-server/bundle/ ./
COPY --from=builder /build/apps/app-server/package.json ./
COPY --from=builder /build/.npmrc ./
RUN pnpm remove @deeplib/data @deeplib/db @deeplib/misc @stdlib/base64 \
  @stdlib/crypto @stdlib/data @stdlib/db @stdlib/misc @stdlib/redlock \
  @stdlib/testing
RUN pnpm add knex ws pg msgpackr
CMD pm2 start /app/main.js -i max && pm2 logs