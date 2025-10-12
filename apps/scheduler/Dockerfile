FROM node:18 AS builder

RUN npm install -g pnpm@8.15.9

WORKDIR /build
COPY ./ ./
RUN pnpm install --frozen-lockfile --filter deepnotes --filter @deepnotes/scheduler...
RUN pnpm --filter @deepnotes/scheduler run bundle

FROM node:18-alpine AS runner

RUN npm install -g pnpm@8.15.9
RUN mkdir /usr/local/pnpm
ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="${PATH}:/usr/local/pnpm"

WORKDIR /app
COPY --from=builder /build/apps/scheduler/dist/ ./
RUN pnpm init
RUN pnpm install knex ws pg
CMD ["node", "/app/index.js"]