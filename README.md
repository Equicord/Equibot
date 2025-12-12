# Equibot

Equibot is a Discord bot used on the [Equicord](https://equicord.org/discord) Discord server.

This bot is extremely specific and not configurable so there is really no reason for you to want to self host it

Nevertheless it is still available under a free software license so you can easily audit and modify it!

## Setup

Prequisites: git, nodejs, pnpm

1. Clone the repository
2. Open `src/config.ts` and edit all the values. Many modules can be disabled via their `enabled` config value.
    If you disable a module, you don't need to fill in any other config values for it.

## Running

1. Run `pnpm install` to install dependencies
2. Run `pnpm start` to start the bot

## HTTP Server

The bot includes a HTTP server that is used for some modules (namely GitHub linking and the Equicord reporter). If you want to enable it,
you also have to set up a reverse proxy to forward traffic to the bot.
