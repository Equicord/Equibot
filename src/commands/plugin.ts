import leven from "leven";

import { defineCommand } from "../Command";
import { VENCORD_SITE } from "../constants";
import { makeCachedJsonFetch } from "../util";

interface Plugin {
    name: string;
    description: string;
    authors: { name: string; id: string }[];

    required: boolean;
    enabledByDefault: boolean;

    hasPatches: boolean;
    hasCommands: boolean;
}

const fetchPlugins = makeCachedJsonFetch<Plugin[]>(
    VENCORD_SITE + "/plugins.json"
);

defineCommand({
    name: "plugin",
    rawContent: true, // since we just want the plugin name, and at least one has spaces
    async execute(msg, query) {
        if (!msg.inCachedGuildChannel()) return;

        const plugins = await fetchPlugins();

        const match = (() => {
            if (!query) return;

            query = query.toLowerCase();
            return plugins.find(p => p.name.toLowerCase().includes(query));
        })();

        if (match) {
            return msg.channel.createMessage({
                embeds: [
                    {
                        title: match.name,
                        description: match.description,
                        color: 0xdd7878,
                        fields: [
                            {
                                name: "Authors",
                                value: match.authors
                                    .map(a =>
                                        // if they don't have an ID, don't mention them
                                        a.id ? `<@${a.id}> ${a.name}` : a.name
                                    )
                                    .join(", "),
                            },
                            {
                                name: "Required",
                                value: match.required ? "Yes" : "No",
                                inline: true,
                            },
                            {
                                name: "Enabled by default",
                                value: match.enabledByDefault ? "Yes" : "No",
                                inline: true,
                            },
                            {
                                name: "Has patches",
                                value: match.hasPatches ? "Yes" : "No",
                                inline: true,
                            },
                            {
                                name: "Has commands",
                                value: match.hasCommands ? "Yes" : "No",
                                inline: true,
                            },
                        ],
                    },
                ],
            });
        }

        // find plugins with similar names, in case of minor typos
        const similarPlugins = plugins
            .map(p => ({ name: p.name, distance: leven(p.name, query) }))
            .filter(p => p.distance < 4)
            .sort((a, b) => a.distance - b.distance);

        if (similarPlugins.length > 0) {
            return msg.channel.createMessage({
                content: `Couldn't quite find the plugin you were looking for. Did you mean...\n${similarPlugins
                    .map(p => `- ${p.name}`)
                    .join("\n")}`,
            });
        }

        return msg.channel.createMessage({
            content:
                "Couldn't find a plugin with that name, and there are no plugins with similar names.",
        });
    },
});
