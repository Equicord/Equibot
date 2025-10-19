import { AnyTextableChannel, ApplicationCommandTypes, ComponentInteraction, ComponentTypes, InteractionTypes, MessageFlags, SelectMenuTypes } from "oceanic.js";

import { Vaius } from "~/Client";
import { handleCommandInteraction, handleInteraction } from "~/SlashCommands";

import Config from "~/config";
import { SupportInstructions, SupportTagList } from "./support";

const enum Commands {
    Support = "Send Support Tag",
}

Vaius.once("ready", () => {
    Vaius.application.createGuildCommand(Config.homeGuildId, {
        type: ApplicationCommandTypes.MESSAGE,
        name: Commands.Support
    });
});

handleCommandInteraction({
    name: Commands.Support,
    async handle(interaction) {
        const options = SupportTagList.map(tags => ({
            value: tags[0],
            label: tags[0],
            emoji: { name: SupportInstructions[tags[0]].emoji }
        }));

        await interaction.createMessage({
            flags: MessageFlags.EPHEMERAL,
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: [{
                    type: ComponentTypes.STRING_SELECT,
                    customID: `${Commands.Support}:${interaction.data.targetID}`,
                    options
                }]
            }]
        });
    }
});

handleInteraction({
    type: InteractionTypes.MESSAGE_COMPONENT,
    isMatch: i =>
        i.data.componentType === ComponentTypes.STRING_SELECT && (
            i.data.customID.startsWith(Commands.Support + ":")
        ),
    async handle(interaction: ComponentInteraction<SelectMenuTypes, AnyTextableChannel>) {
        const [command, targetId] = interaction.data.customID.split(":");
        if (!command || !targetId) return;

        const choice = interaction.data.values.getStrings()[0];

        const defer = interaction.defer(MessageFlags.EPHEMERAL);

        const replyOptions = {
            messageReference: { messageID: targetId },
            allowedMentions: { repliedUser: true }
        };

        const FOLLOWUP_OKAY = "Sent!";
        let followUp = FOLLOWUP_OKAY;
        try {
            switch (command) {
                case Commands.Support:
                    await interaction.channel.createMessage({
                        ...replyOptions,
                        content: SupportInstructions[choice].content + `\n\n(Auto-response invoked by ${interaction.user.mention})`
                    });
                    await defer;
                    break;
                default:
                    followUp = "uh oh";
                    break;
            }

        } catch (e) {
            followUp = "Something exploded :(";
            throw e;
        } finally {
            await interaction.deleteFollowup(interaction.message.id);
            await defer;
            const res = await interaction.createFollowup({ content: followUp, flags: MessageFlags.EPHEMERAL });
            if (followUp === FOLLOWUP_OKAY)
                await res.deleteMessage();
        }
    }
});
