import leven from "leven";

import { defineCommand } from "../Command";
import { VENCORD_SITE } from "../constants";
import { makeCachedJsonFetch, reply } from "../util";
import { stripIndent } from "../util/text";

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
    aliases: ["viewplugin", "p"],
    description: "Provides information on a plugin",
    usage: "<plugin name>",
    guildOnly: true,
    rawContent: true, // since we just want the plugin name, and at least one has spaces
    async execute(msg, _channelId, query) {
        if (!msg.inCachedGuildChannel()) return;

        const plugins = await fetchPlugins();

        const match = (() => {
            if (!query) return;

            query = query.toLowerCase();
            return plugins.find(p => p.name.toLowerCase().includes(query));
        })();

        if (match) {
            let pluginInfo = stripIndent`
            ## [\`${match.name}\`](<https://vencord.dev/plugins/${encodeURIComponent(match.name)}>)
            ${match.description}
            ### Authors
            ${match.authors
                .map(
                    a =>
                        // if they don't have an ID, don't mention them
                        `- ${a.id ? `<@${a.id}> ${a.name}` : a.name}`
                )
                .join("\n")}
            `;

            const abilities = stripIndent`
                ${match.required ? "`*️⃣` required" : ""}
                ${match.enabledByDefault ? "`✅` enabled by default" : ""}
                ${match.hasPatches ? "`🩹` has patches" : ""}
                ${match.hasCommands ? "`💬` has chat commands" : ""}
            `.replace(/^\s*\n/gm, ""); // remove blanks

            for (const section of [abilities])
                if (section) pluginInfo += `\n${section}\n`;

            return reply(msg, { content: pluginInfo });
        }

        // find plugins with similar names, in case of minor typos
        const similarPlugins = plugins
            .map(p => ({ name: p.name, distance: leven(p.name, query) }))
            .filter(p => p.distance < 4)
            .sort((a, b) => a.distance - b.distance);

        if (similarPlugins.length > 0) {
            return reply(msg, {
                content: `Couldn't quite find the plugin you were looking for. Did you mean...\n${similarPlugins
                    .map(p => `- ${p.name}`)
                    .join("\n")}`,
            });
        }

        return reply(msg, {
            content:
                "Couldn't find a plugin with that name, and there are no plugins with similar names.",
        });
    },
});
