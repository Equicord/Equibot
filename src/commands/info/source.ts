import { defineCommand } from "~/Commands";
import { registerChatInputCommand } from "~/SlashCommands";
import { getGitRemote } from "~/util/git";

const getSourceMessage = async () => "I am free software! You can find my Source code at " + await getGitRemote();

defineCommand({
    name: "source-code",
    aliases: ["source"],
    description: "Get the source code for this bot",
    usage: null,
    async execute({ reply }) {
        return reply(await getSourceMessage());
    }
});

registerChatInputCommand(
    {
        name: "source-code",
        description: "Get the source code for this bot",
    },
    {
        async handle(interaction) {
            return interaction.reply({ content: await getSourceMessage() });
        }
    }
);
