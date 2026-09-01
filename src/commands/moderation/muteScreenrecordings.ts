import { ComponentTypes, InteractionTypes, MessageFlags, TextInputStyles, User } from "oceanic.js";

import { defineCommand } from "~/Commands";
import Config from "~/config";
import { BotState } from "~/db/botState";
import { handleInteraction, registerChatInputCommand } from "~/SlashCommands";
import { canManageMutedUsers } from "~/util/mutedUsers";
import { buildContent } from "~/util/muteScreenrecordingsFormat";
import { resolveUser } from "~/util/resolvers";
import { CommandSubCommandOption, CommandUserOption } from "~components";

const Name = "ss-mute";

function addMutedUser(user: Pick<User, "id" | "mention">) {
    if (BotState.mutedUsers.includes(user.id))
        return `${user.mention} is already on the list.`;

    BotState.mutedUsers = [...BotState.mutedUsers, user.id];
    return `Added ${user.mention} to the screen recording mute list.`;
}

function removeMutedUser(user: Pick<User, "id" | "mention">) {
    if (!BotState.mutedUsers.includes(user.id))
        return `${user.mention} isn't on the list.`;

    BotState.mutedUsers = BotState.mutedUsers.filter(id => id !== user.id);
    return `Removed ${user.mention} from the screen recording mute list.`;
}

const OPERATION_ALIASES: Record<string, string> = {
    a: "add",
    r: "remove",

    add: "add",
    remove: "remove",
    rm: "remove"
};

registerChatInputCommand(
    {
        name: Name,
        description: "Manage the screen recording auto-mute list",
        defaultMemberPermissions: "0",
        options: [
            CommandSubCommandOption({
                name: "add",
                description: "Add a user whose screen recordings get automatically muted",
                options: [CommandUserOption({ name: "user", description: "The user to add", required: true })]
            }),
            CommandSubCommandOption({
                name: "remove",
                description: "Remove a user from the screen recording auto-mute list",
                options: [CommandUserOption({ name: "user", description: "The user to remove", required: true })]
            })
        ]
    },
    {
        guildOnly: true,
        async handle(i) {
            if (!canManageMutedUsers(i.user.id, i.member?.roles))
                return i.createMessage({ content: "You are not allowed to do this.", flags: MessageFlags.EPHEMERAL });

            const [subcommand] = i.data.options.getSubCommand(true);
            const user = i.data.options.getUser("user", true);

            const content = subcommand === "remove" ? removeMutedUser(user) : addMutedUser(user);

            return i.createMessage({ content, flags: MessageFlags.EPHEMERAL });
        }
    }
);

defineCommand({
    name: Name,
    description: "Manage the screen recording auto-mute list",
    usage: "<add|remove> <user>",
    guildOnly: true,
    allowedRoles: [Config.roles.mod],
    async execute({ reply }, content) {
        const [operation, value] = content.split(" ");
        const op = OPERATION_ALIASES[operation?.toLowerCase()] ?? operation?.toLowerCase();
        const user = await resolveUser(value);
        if (!user) return reply("I couldn't find that user.");

        switch (op) {
            case "add":
                reply(addMutedUser(user));
                break;
            case "remove":
                reply(removeMutedUser(user));
                break;
            default:
                return reply(`Usage: ${Name} <add|remove> <user>`);
        }
    }
});

handleInteraction({
    type: InteractionTypes.MESSAGE_COMPONENT,
    isMatch: i => i.data.customID.startsWith("mute-screenrecordings-delete:"),
    async handle(interaction) {
        const [, authorId] = interaction.data.customID.split(":");

        if (interaction.user.id !== authorId && !canManageMutedUsers(interaction.user.id, interaction.member?.roles)) {
            return interaction.reply({
                content: "You are not allowed to delete this.",
                flags: MessageFlags.EPHEMERAL
            });
        }
        await interaction.message.delete();
    }
});

handleInteraction({
    type: InteractionTypes.MESSAGE_COMPONENT,
    isMatch: i => i.data.customID.startsWith("mute-screenrecordings-edit:"),
    async handle(interaction) {
        const [, authorId] = interaction.data.customID.split(":");

        if (interaction.user.id !== authorId) {
            return interaction.reply({
                content: "Only the original poster can edit this.",
                flags: MessageFlags.EPHEMERAL
            });
        }

        await interaction.createModal({
            title: "Edit Message",
            customID: `mute-screenrecordings-edit-modal:${authorId}`,
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: [{
                    type: ComponentTypes.TEXT_INPUT,
                    customID: "text",
                    label: "Message",
                    style: TextInputStyles.PARAGRAPH,
                    value: (() => {
                        const prefix = `From <@${authorId}> (video muted):\n\n`;
                        const { content } = interaction.message;
                        return content.startsWith(prefix) ? content.slice(prefix.length) : content;
                    })(),
                    maxLength: 1900,
                    required: false
                }]
            }]
        });
    }
});

handleInteraction({
    type: InteractionTypes.MODAL_SUBMIT,
    isMatch: i => i.data.customID.startsWith("mute-screenrecordings-edit-modal:"),
    async handle(interaction) {
        const [, authorId] = interaction.data.customID.split(":");

        if (interaction.user.id !== authorId || !interaction.message) return;

        const text = interaction.data.components.getTextInput("text") ?? "";

        await interaction.deferUpdate();
        await interaction.message.edit({ content: buildContent(authorId, text) });
    }
});
