import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { reply } from "~/util";

function parseArgs(args: string[]) {
    let property = args[0]?.toLowerCase()
    if (property === "description") property = "topic"

    return {
        property: property as "name" | "topic" | undefined,
        value: args.slice(1).join(" ")
    }
}

defineCommand({
    name: "edit-channel",
    description: "Edit a channels name or topic",
    usage: "<name|topic|description> <value>",
    aliases: ["channel-edit", "ce", "ec"],
    guildOnly: true,
    modOnly: true,
    async execute(msg, ...args) {
        const {property, value} = parseArgs(args)

        if (!property) {
            return reply(msg, "What am I supposed to edit, dummy?");
        }

        if (!["name", "topic"].includes(property)) {
            return reply(msg, "You can only edit the channel name or topic");
        }

        if (!value.length) {
            return reply(msg, `Remember to provide the new ${property}!`);
        }

        msg.channel.edit({ [property]: value })
            .catch(() => { msg.createReaction(Emoji.X) })
            .then(() => { msg.createReaction(Emoji.CheckMark) });
    }
});
