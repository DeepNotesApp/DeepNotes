FROM node:16 AS builder

RUN npm install -g pnpm

WORKDIR /build
COPY ./ ./
RUN pnpm install --filter deepnotes --filter @deepnotes/scheduler...
RUN pnpm --filter @deepnotes/scheduler run bundle

FROM node:16-alpine AS runner

RUN npm install -g pnpm
RUN mkdir /usr/local/pnpm
ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="${PATH}:/usr/local/pnpm"
RUN pnpm add -g pm2

WORKDIR /app
COPY --from=builder /build/apps/scheduler/dist/ ./
RUN pnpm init
RUN pnpm install knex ws pg
CMD pm2 start /app/index.js -i max && pm2 logs