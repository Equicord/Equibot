import leven from "leven";
import { MessageFlags } from "oceanic.js";

import { CommandContext, defineCommand } from "~/Commands";
import { registerChatInputCommand } from "~/SlashCommands";
import { CommandStringOption } from "~components";
import { run } from "~/util/functions";
import { Plugin, fetchPlugins, buildPluginInfoMessage } from "./pluginUtils";

async function sendPluginInfo({ reply }: CommandContext, plugin: Plugin) {
    return reply(buildPluginInfoMessage(plugin));
}

defineCommand({
    name: "plugin",
    aliases: ["viewplugin", "p"],
    description: "Provides information on a plugin",
    usage: "<plugin name>",
    rawContent: true,
    async execute(ctx, query) {
        const { reply } = ctx;

        if (!query) return reply("Please give me a plugin name");


        const plugins = await fetchPlugins();

        const match = run(() => {
            if (!query) return;

            query = query.toLowerCase();
            return plugins.find(p => p.name.toLowerCase().includes(query));
        });

        if (match)
            return sendPluginInfo(ctx, match);

        const similarPlugins = plugins
            .map(p => ({
                name: p.name,
                distance: leven(p.name.toLowerCase(), query.toLowerCase()),
            }))
            .filter(p => p.distance <= 3)
            .sort((a, b) => a.distance - b.distance);

        if (similarPlugins.length === 1)
            return sendPluginInfo(ctx, plugins.find(p => p.name === similarPlugins[0].name)!);

        if (similarPlugins.length > 0) {
            const suggestions = similarPlugins
                .map(p => `- ${p.name}`)
                .join("\n");

            return reply(
                `Couldn't quite find the plugin you were looking for. Did you mean...\n${suggestions}`
            );
        }

        return reply("Couldn't find a plugin with that name, and there are no plugins with similar names.");
    },
});

registerChatInputCommand(
    {
        name: "plugin",
        description: "Provides information on a plugin",
        options: <>
            <CommandStringOption name="name" description="The plugin name" required autocomplete />
        </>
    },
    {
        async handle(interaction) {
            const pluginName = interaction.data.options.getString("name", true);
            const plugins = await fetchPlugins();
            const pluginNameLower = pluginName.toLowerCase();
            const plugin = plugins.find(p => p.name.toLowerCase() === pluginNameLower);

            if (!plugin) {
                return interaction.reply({
                    flags: MessageFlags.EPHEMERAL,
                    content: `Plugin "${pluginName}" not found.`
                });
            }

            interaction.reply(buildPluginInfoMessage(plugin));
        },

        async autoComplete(interaction) {
            const focusedValue = (interaction.data.options.getFocused(true).value as string).toLowerCase();

            const plugins = await fetchPlugins();

            const matchingPlugins = plugins
                .map(p => ({ original: p, lowerName: p.name.toLowerCase() }))
                .filter(({ lowerName }) => lowerName.includes(focusedValue))
                .slice(0, 25)
                .map(({ original }) => ({
                    name: original.name,
                    value: original.name
                }));

            interaction.result(matchingPlugins);
        }
    }
);
