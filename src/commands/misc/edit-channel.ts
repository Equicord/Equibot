import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { reply } from "~/util";

function parseArgs(args: string[]) {
    return {
        property: args[0]?.toLowerCase() as "name" | "topic" | undefined,
        value: args.slice(1).join(" ")
    }
}

defineCommand({
    name: "edit-channel",
    description: "Edit a channels name or topic",
    usage: "<name|topic> <value>",
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

        let didError = false;
        switch (property) {
            case "name": 
                msg.client.rest.channels.edit(msg.channelID, { name: value })
                    .catch(e => { didError = true });
                break;
            case "topic": 
                msg.client.rest.channels.edit(msg.channelID, { topic: value })
                    .catch(e => { didError = true });
                break;
        }

        msg.createReaction(didError ? Emoji.X : Emoji.CheckMark);
    }
});
