import { defineCommand } from "../Command";
import { reply } from "../util";

defineCommand({
    name: "shiggy",
    aliases: ["shig"],
    execute(msg) {
        return reply(msg, { content: `https://shiggy.fun/api/v2/random?q=${Math.floor(Math.random() * 100000)}` });
    },
});
