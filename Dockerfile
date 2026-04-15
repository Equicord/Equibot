FROM node:lts-slim AS build
WORKDIR /app

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package*.json pnpm-*.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

FROM node:lts-slim
WORKDIR /app

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg nano && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://repo.jellyfin.org/jellyfin_team.gpg.key | gpg --dearmor -o /etc/apt/keyrings/jellyfin.gpg && \
    echo "Types: deb\nURIs: https://repo.jellyfin.org/debian\nSuites: bookworm\nComponents: main\nArchitectures: amd64\nSigned-By: /etc/apt/keyrings/jellyfin.gpg" > /etc/apt/sources.list.d/jellyfin.sources && \
    apt-get update && \
    apt-get install -y --no-install-recommends jellyfin-ffmpeg7 && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json pnpm-*.yaml ./
COPY assets ./assets
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

CMD ["pnpm", "start"]
