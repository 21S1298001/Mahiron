FROM node:19.7.0-bullseye-slim AS build

WORKDIR /app

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends build-essential

COPY ./package.json /app/package.json
COPY ./pnpm-lock.yaml /app/pnpm-lock.yaml

RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile

COPY ./tsconfig.json /app/tsconfig.json
COPY ./tsconfig.webpack.json /app/tsconfig.webpack.json
COPY ./webpack.config.js /app/webpack.config.js
COPY ./api.d.ts /app/api.d.ts
COPY ./src /app/src

ENV NODE_ENV=production

RUN pnpm run build

FROM node:19.7.0-bullseye-slim

ENV DOCKER=YES
ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
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
    dvb-tools \
    && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY ./docker-entrypoint.sh /app/docker-entrypoint.sh
COPY ./api.yml /app/api.yml
COPY ./bin /app/bin
COPY ./config /app/config
COPY ./package.json /app/package.json
COPY ./pnpm-lock.yaml /app/pnpm-lock.yaml

RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --prod

COPY --from=build /app/lib /app/lib

CMD ["bash", "./docker-entrypoint.sh"]

EXPOSE 40772 9229
