# syntax=docker/dockerfile:1

FROM node:16.19.1-bullseye-slim AS development
WORKDIR /app
ENV NODE_ENV=development

CMD ["bash", "-c", "yarn install --immutable && ./docker/container-init.sh"]

FROM node:16.19.1-bullseye-slim AS build-server
WORKDIR /app
ENV NODE_ENV=production

COPY ./.yarn/ ./.yarn/
COPY ./package.json ./yarn.lock ./.yarnrc.yml ./
RUN --mount=type=cache,target=/app/.yarn/cache yarn install --immutable

COPY ./src/ ./src/
COPY ./types/ ./types/
COPY ./tsconfig.json ./
RUN yarn build

FROM node:16.19.1-bullseye-slim AS build-ui
WORKDIR /app
ENV NODE_ENV=production

COPY ./../mahiron-ui/.yarn/ ./.yarn/
COPY ./../mahiron-ui/package.json ./yarn.lock ./.yarnrc.yml ./
RUN --mount=type=cache,target=/app/.yarn/cache yarn install --immutable

COPY ./src/ ./src/
COPY ./types/ ./types/
COPY ./tsconfig.json ./
RUN yarn build

FROM node:16.19.1-bullseye-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  apt update \
    && apt install -y --no-install-recommends \
        ca-certificates \
        make \
        gcc \
        g++ \
        pkg-config \
        pcscd \
        libpcsclite-dev \
        libccid \
        libdvbv5-dev \
        pcsc-tools \
        dvb-tools

COPY ./package.json ./
RUN --mount=type=cache,target=/app/.yarn/cache yarn install --immutable --production

COPY ./api.yml ./processes.json ./
COPY ./bin/ ./bin/
COPY ./docker/ ./docker/
COPY ./../../config/ ./config/
COPY --from=build-server /app/dist/ ./dist/
COPY --from=build-ui /app/dist/ ./dist/ui/

EXPOSE 40772
CMD ["./docker/entrypoint.sh"]
