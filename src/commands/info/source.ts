import { gitRemote } from "__gitData__";
import { defineCommand } from "~/Commands";
import { registerChatInputCommand } from "~/SlashCommands";

const SOURCE_MESSAGE = "I am free software! You can find my Source code at " + gitRemote;

defineCommand({
    name: "source-code",
    aliases: ["source"],
    description: "Get the source code for this bot",
    usage: null,
    async execute({ reply }) {
        return reply(SOURCE_MESSAGE);
    }
});

registerChatInputCommand(
    {
        name: "source-code",
        description: "Get the source code for this bot",
    },
    {
        async handle(interaction) {
            return interaction.reply({ content: SOURCE_MESSAGE });
        }
    }
);
