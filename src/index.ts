import "./config";

import "./Commands";

import "__modules__";

import {
    ApplicationCommandTypes
} from "oceanic.js";

import { Vaius } from "./Client";
import { PROD } from "./constants";
// eslint-disable-next-line no-duplicate-imports
import { initDevListeners } from "./modules/devTracker";
import { initModListeners } from "./modules/moderate";
import { handleCommandInteraction } from "./SlashCommands";

if (PROD) {
    Vaius.once("ready", () => {
        Vaius.application.createGlobalCommand({
            type: ApplicationCommandTypes.CHAT_INPUT,
            name: "stare",
            description: "stare...",
        });
    });

    handleCommandInteraction({
        name: "stare",
        handle(i) {
            i.createMessage({ content: "dance dance" });
        }
    });
}

initModListeners();
initDevListeners();

Vaius.connect().catch(console.error);
