import { ButtonStyles, ComponentTypes, MessageFlags } from "oceanic.js";
import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import { REACTION_ROLES_CHANNEL_ID } from "~/env";
import { handleComponentInteraction } from "~/SlashCommands";

const REACTIONS_ASSIGN = "reactions:assign";

const reactionRoles = {
    "Vencord Announcements": { 
        role: "1166731270542340146",
        emoji: "1092089799109775453",
        description: "Important announcements for Vencord"
    },
    "Server Announcements": { 
        role: "1166731271943237662", 
        emoji: "1136410368411959396",
        description: "Changes that happen on the server, such as new channels or rules"
    },
    "Plugin Announcements": { 
        role: "1166731273155379220", 
        emoji: "1024751291504791654",
        description: "Get notified for new and reworked plugins"
    },
};

defineCommand({
    name: "reactions:post",
    description: "Post the reaction roles message",
    usage: null,
    execute(interaction) {
        return Vaius.rest.channels.createMessage(REACTION_ROLES_CHANNEL_ID, {
            embeds: [{
                description: [
                    "Want to be notified for Vencord related things? Press the buttons below to get roles!",
                    ...Object.entries(reactionRoles).map(([label, data]) => 
                    `**${label}**\n${data.description}`
                    )
                ].join("\n\n"),
                author: {
                    name: "Get Notified",
                    iconURL: interaction.msg.guild?.iconURL() ?? Vaius.user.avatarURL(),
                },
            }],
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: Object.entries(reactionRoles).map(([label, data]) => ({
                    type: ComponentTypes.BUTTON,
                    style: ButtonStyles.SECONDARY,
                    customID: `${REACTIONS_ASSIGN}_${data.role}`,
                    label,
                    emoji: { id: data.emoji }
                }))
            }]
        });
    }
});

Object.values(reactionRoles).forEach(role => {
    handleComponentInteraction({
        customID: `${REACTIONS_ASSIGN}_${role.role}`,
        guildOnly: true,
        async handle(interaction) {
            if (!interaction.member) return;

            try {
                const hasRole = interaction.member.roles.includes(role.role);
                const action = hasRole ? 'removeRole' : 'addRole';
                
                await interaction.member[action](role.role);
                await interaction.createMessage({
                    content: `${hasRole ? 'Removed' : 'Added'} <@&${role.role}> ${hasRole ? ' from you :(' : 'to you :D'}`,
                    flags: MessageFlags.EPHEMERAL
                });
            } catch {
                await interaction.createMessage({
                    content: "Something went wrong D:",
                    flags: MessageFlags.EPHEMERAL
                });
            }
        },
    });
});
