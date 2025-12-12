FROM node:lts-alpine AS build
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package*.json pnpm-*.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

FROM node:lts-alpine
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apk update && apk add --no-cache sqlite

RUN mkdir -p data

COPY package*.json pnpm-*.yaml ./
COPY sql ./sql
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist

CMD ["pnpm", "start"]
