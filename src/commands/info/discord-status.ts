import { defineCommand } from "~/Commands";
import { reply } from "~/util";
import { toTitle } from "~/util/text";

const statusEmoji = (status: string) => {
    switch (status) {
        case "operational":
            return "🟢";
        case "degraded_performance":
            return "🟡";
        case "partial_outage":
            return "🟠";
        case "major_outage":
            return "🔴";
        default:
            return "⚪";
    }
};

const impactEmoji = (impact: string) => {
    switch (impact) {
        case "none":
            return "⚫";
        case "maintenance":
            return "🟡";
        case "minor":
            return "🟡";
        case "major":
            return "🟠";
        case "critical":
            return "🔴";
        default:
            return "⚫";
    }
}

interface DiscordComponentsResponse {
    components: Array<{ 
        id: string; 
        name: string; 
        status: string; 
        description: string;
        position: number;
        created_at: string
    }>;
}

interface DiscordIncdentsResponse {
    incidents: Array<{ 
        id: string; 
        name: string; 
        status: string; 
        impact: string;
        incident_updates: Array<any>;
    }>;
}

defineCommand({
    name: "discord-status",
    aliases: ["dstatus", "ds"],
    description: "Check if discord incendents are happening",
    usage: null,
    async execute(msg) {
        const components = await getDiscordStatusComponents();
        const incidents = await getDiscordStatusIncidents();

        if (!components || !incidents) {
            return reply(msg, "Can't get discord status at the moment :c");
        }

        const desiredOutages = incidents.incidents.filter(
            i => i.status !== "resolved"
        );

        const desiredComponents = components.components.filter(c => [
            "API", 
            "Media Proxy",
            "Push Notifications",
            "Search",
            "Voice",
            "Gateway",
        ].includes(c.name));

        const systemStatuses = desiredComponents.map(
            c => `${statusEmoji(c.status)} **${c.name}**: ${toTitle(c.status)}`
        )

        const systemOutages = desiredOutages.map(i => {
            const identifiedUpdate = i.incident_updates.find(update => update.status === "identified");
        
            return `**Incident:** ${impactEmoji(i.impact)} ${i.name}
**Status:** 🔴 ${toTitle(i.status)}
**Identified At:** ${identifiedUpdate ? `<t:${Math.floor(new Date(identifiedUpdate.created_at).getTime() / 1000)}:F>` : 'N/A'}
**Last Updated:** <t:${Math.floor(new Date(i.incident_updates[0].updated_at).getTime() / 1000)}:F>
            `;
        });

        const systemOutagesText = 
        `\n\n__**Latest Outage Information**__\n ${systemOutages.join("\n")}`;

        const description = systemStatuses.join("\n");

        return reply(msg, { 
            embeds: [{
                title: "Discord Status",
                color: 0x5865F2,
                description: description+systemOutagesText,
            }],
        });
    }
});

async function getDiscordStatusComponents(): Promise<DiscordComponentsResponse | null> {
    try {
        const response = await fetch("https://discordstatus.com/api/v2/components.json");
        const data: DiscordComponentsResponse = await response.json() as DiscordComponentsResponse;
        return data;
    } catch (error) {
        console.error("Error fetching Discord components:", error);
        return null;
    }
}

async function getDiscordStatusIncidents(): Promise<DiscordIncdentsResponse | null>   {
    try {
        const response = await fetch("https://discordstatus.com/api/v2/incidents.json");
        const data: DiscordIncdentsResponse = await response.json() as DiscordIncdentsResponse;
        return data;
    } catch (error) {
        console.error("Error fetching Discord incidents:", error);
        return null;
    }
}


