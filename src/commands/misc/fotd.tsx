import { ButtonStyles, InteractionTypes, MessageFlags } from "oceanic.js";

import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji } from "~/constants";
import { handleInteraction } from "~/SlashCommands";
import { silently } from "~/util/functions";
import { ActionRow, Button, ComponentMessage, TextDisplay } from "~components";

const FOTD_CHANNEL_ID = "1547329048177414185";
const FOTD_ROLE_ID = "1547329300586434740";
const FOTD_ROLE_PINGERS = "1547574643639197726";

defineCommand({
    name: "fotd",
    description: "Sends the fact of the day ping",
    usage: "",
    guildOnly: true,
    async execute({ msg, reply }) {
        const hasPerms = msg.member.roles.some(r => [Config.roles.mod, FOTD_ROLE_PINGERS].includes(r));
        if (!hasPerms)
            return silently(msg.createReaction(Emoji.Anger));

        await reply(
            <ComponentMessage>
                <TextDisplay>Ping for fact of the day?</TextDisplay>
                <ActionRow>
                    <Button style={ButtonStyles.SUCCESS} customID={`fotd-yes:${msg.author.id}:${msg.id}`}>Yes</Button>
                    <Button style={ButtonStyles.DANGER} customID={`fotd-no:${msg.author.id}:${msg.id}`}>No</Button>
                </ActionRow>
            </ComponentMessage>
        );
    },
});

handleInteraction({
    type: InteractionTypes.MESSAGE_COMPONENT,
    isMatch: i => i.data.customID.startsWith("fotd-yes:") || i.data.customID.startsWith("fotd-no:"),
    async handle(interaction) {
        const [action, authorId, commandMessageId] = interaction.data.customID.split(":");

        if (interaction.user.id !== authorId) {
            return interaction.reply({
                content: "Only the person who ran the command can do this.",
                flags: MessageFlags.EPHEMERAL
            });
        }

        if (action === "fotd-yes") {
            await interaction.client.rest.channels.createMessage(FOTD_CHANNEL_ID, {
                content: `<@&${FOTD_ROLE_ID}>`,
                allowedMentions: {
                    roles: [FOTD_ROLE_ID],
                },
            });
        }

        await silently(interaction.message.delete());
        await silently(interaction.client.rest.channels.deleteMessage(interaction.channelID, commandMessageId));
    }
});
