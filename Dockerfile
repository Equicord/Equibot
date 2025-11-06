FROM node:lts
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

CMD ["pnpm", "start"]
