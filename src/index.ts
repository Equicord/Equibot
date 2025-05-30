import "source-map-support/register";
import "./env";
import "./Commands";
import "__modules__";

import {
    ApplicationCommandTypes,
    DiscordHTTPError
} from "oceanic.js";

import { Vaius } from "./Client";
import { PROD } from "./constants";
// eslint-disable-next-line no-duplicate-imports
import { DEV_CHANNEL_ID } from "./env";
import { initModListeners } from "./modules/moderate";
import { handleCommandInteraction } from "./SlashCommands";
import { silently } from "./util/functions";
import { inspect } from "./util/inspect";
import { toCodeblock } from "./util/text";

if (PROD) {
    Vaius.once("ready", () => {
        Vaius.application.createGlobalCommand({
            type: ApplicationCommandTypes.CHAT_INPUT,
            name: "stare",
            description: "stare....",
        });
    });

    handleCommandInteraction({
        name: "stare",
        handle(i) {
            i.createMessage({ content: "stare...." });
        }
    });
}

initModListeners();

export async function handleError(title: string, err: unknown) {
    if (err instanceof DiscordHTTPError && err.status >= 500)
        return;

    console.error(`${title}:`, err);

    if (PROD) return;

    const stack = err instanceof Error && err.stack;
    const text = stack || inspect(err);

    await Vaius.rest.channels.createMessage(DEV_CHANNEL_ID, {
        embeds: [{
            title,
            description: toCodeblock(text, stack ? "js" : ""),
            color: 0xff0000
        }]
    });
}

process.on("unhandledRejection", err => handleError("Unhandled Rejection", err));

process.on("uncaughtException", async err => {
    await silently(handleError("Uncaught Exception. Restarting process", err));
    try { } catch { }

    process.exit(1);
});

Vaius.on("error", err => {
    // Ignore 5xx errors from Discord
    if (String(err).includes("Unexpected server response: 5"))
        return;

    handleError("Unhandled Client Error", err);
});

Vaius.connect().catch(console.error);
