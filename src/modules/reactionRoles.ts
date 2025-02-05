import { ButtonStyles, ComponentTypes, MessageFlags } from "oceanic.js";
import { emoji } from "valibot";
import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import { REACTION_ROLES_CHANNEL_ID } from "~/env";
import { handleComponentInteraction } from "~/SlashCommands";

const REACTIONS_ASSIGN = "reactions:assign";

const EMBED_COLOR = 0xde7878;
const LONG_IMAGE = "https://i.sstatic.net/Fzh0w.png";

const notificationRoles = {
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

const accessRoles = {
    "Off-topic Channels": { 
        role: "0", // replace with role id
        name: "🍐",
        description: "Gives you access to off-topic and miscellaneous channels"
    },
    "Development Channels": { 
        role: "1191202487978438656", 
        name: "👾",
        description: "Gives you access to development and programming channels"
    },
};

const entries = [
    Object.entries(notificationRoles),
    Object.entries(accessRoles)
];

defineCommand({
    name: "reactions:post",
    description: "Post the reaction roles message",
    usage: null,
    async execute(interaction) {
        const messages = entries.map((entry, index) => ({
            content: index === 0 
                ? "Press on the buttons below to get notified or get access to specific channels!" 
                : "",
            embeds: [{
                description: entry
                    .map(([label, data]) => `**${label}**\n${data.description}`)
                    .join("\n\n"),
                color: EMBED_COLOR,
                image: { url: LONG_IMAGE }
            }],
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: entry.map(([label, data]) => ({
                    type: ComponentTypes.BUTTON,
                    customID: `${REACTIONS_ASSIGN}_${data.role}`,
                    label,
                    style: ButtonStyles.SECONDARY,
                    emoji: {
                        id: data.emoji ?? null,
                        name: data.name ?? null
                    }
                }))
            }]
        }));

        await Promise.all(messages.map(msg => interaction.createMessage(msg)));
    }
});

entries.flat().forEach(([_, data]) => {
    handleComponentInteraction({
        customID: `${REACTIONS_ASSIGN}_${data.role}`,
        guildOnly: true,
        async handle(interaction) {
            if (!interaction.member) return;

            try {
                const hasRole = interaction.member.roles.includes(data.role);
                const action = hasRole ? 'removeRole' : 'addRole';
                
                await interaction.member[action](data.role);
                await interaction.createMessage({
                    content: `${hasRole ? 'Removed' : 'Added'} <@&${data.role}> ${hasRole ? 'from you :(' : 'to you :D'}`,
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
