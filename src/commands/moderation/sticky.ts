import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { BotState } from "~/db/botState";
import { StickyState } from "~/modules/sticky";
import { toCodeblock } from "~/util/text";

const OPERATION_ALIASES: Record<string, string> = {
    c: "set",
    u: "set",
    d: "delete",
    r: "delete",
    l: "list",
    s: "set",

    cr: "set",
    up: "set",
    rm: "delete",
    ls: "list",
    en: "on",
    de: "delay",
    dl: "delay",

    dly: "delay",
    del: "delete",
    dis: "off",

    enable: "on",
    disable: "off",
    create: "set",
    update: "set",
    remove: "delete",
};

defineCommand({
    name: "sticky",
    description: "Set the sticky message",
    aliases: ["stick", "note", "n"],
    modOnly: true,
    guildOnly: true,
    usage: "<create/update/set | delete/remove | on | off | delay | list> [value]",
    rawContent: true,
    execute({ reply, react, msg, prefix, commandName }, content) {
        let response: string | undefined;

        const [operation, value, ...extra] = content.split(" ");
        const op = OPERATION_ALIASES[operation?.toLowerCase()] ?? operation?.toLowerCase();

        if (op === "list") {
            const mapping = Object.entries(BotState.stickies)
                .map(([channelId, state]) =>
                    `${state.enabled ? Emoji.GreenDot : Emoji.RedDot} ${state.delayMs / 1000}s <#${channelId}>: ${state.message}`
                )
                .join("\n\n");

            return reply(mapping);
        }

        let state = BotState.stickies[msg.channelID];
        if (!state) {
            if (op !== "set") {
                return reply(`No sticky found. Use ${toCodeblock(`${prefix}${commandName} set [message]`)} to create one`);
            }

            state = BotState.stickies[msg.channelID] = {
                message: "",
                delayMs: 5000,
                enabled: true
            };
        }

        const sticky = StickyState.getOrCreate(msg.channelID);
        if (!sticky) throw new Error("Sticky state not found");

        switch (op) {
            case "on":
                state.enabled = true;
                response = "Sticky message enabled!";
                sticky.createDebouncer();
                sticky.createMessage();
                break;

            case "off":
                state.enabled = false;
                response = "Sticky message disabled!";
                sticky.destroy();
                break;

            case "delay":
                const delay = Number(value) * 1000;
                if (isNaN(delay)) {
                    response = "Invalid delay value!";
                } else {
                    state.delayMs = delay;
                    state.enabled = true;
                    response = `Sticky message delay set to ${delay}ms`;
                    sticky.createDebouncer();
                }
                break;

            case "set":
                state.message = [value, ...extra].join(" ");
                state.enabled = true;
                response = "Sticky message set!";
                sticky.createDebouncer();
                sticky.createMessage();
                break;

            case "delete":
                delete BotState.stickies[msg.channelID];
                sticky.destroy();
                response = "Sticky message deleted!";
                break;

            default:
                return react(Emoji.QuestionMark);
        }

        return reply(response);
    }
});
