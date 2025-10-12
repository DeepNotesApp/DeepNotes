FROM node:18 AS builder

ARG STAGING
ARG HOST
ARG APP_SERVER_URL
ARG CLIENT_PORT
ARG REALTIME_SERVER_URL
ARG COLLAB_SERVER_URL

RUN npm install -g pnpm@8.15.9

WORKDIR /build
COPY ./ ./
RUN pnpm install --frozen-lockfile --filter deepnotes --filter @deepnotes/client...
RUN pnpm turbo run build --filter @deepnotes/client...
WORKDIR /build/apps/client
RUN pnpm run build:ssr
RUN pnpm tsup

FROM node:18-alpine AS runner

RUN npm install -g pnpm@8.15.9
RUN mkdir /usr/local/pnpm
ENV PNPM_HOME="/usr/local/pnpm"
ENV PATH="${PATH}:/usr/local/pnpm"
RUN pnpm add -g pm2

WORKDIR /app
COPY --from=builder /build/apps/client/dist/ssr ./
COPY --from=builder /build/.npmrc ./
RUN sed -i 's/"use strict";//g' ./index.cjs
RUN pnpm remove @deeplib/data @deeplib/misc @stdlib/base64 \
  @stdlib/color @stdlib/crypto @stdlib/data @stdlib/misc \
  @stdlib/vue @deepnotes/app-server
CMD ["pm2-runtime", "start", "./index.cjs", "-i", "max"]
