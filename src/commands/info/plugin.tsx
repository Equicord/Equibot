import { MessageFlags } from "oceanic.js";

import { CommandContext, defineCommand } from "~/Commands";
import { registerChatInputCommand } from "~/SlashCommands";
import { CommandStringOption } from "~components";
import { run } from "~/util/functions";
import { Plugin, fetchPlugins, findSimilarPlugins, buildPluginInfoMessage } from "./pluginUtils";

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

        const similarPlugins = findSimilarPlugins(plugins, query);

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
            const plugin = plugins.find(p => p.name.toLowerCase() === pluginName.toLowerCase()) || plugins.find(p => p.name.toLowerCase().includes(pluginName.toLowerCase()));

            if (!plugin) {
                const similarPlugins = findSimilarPlugins(plugins, pluginName).slice(0, 5);

                if (similarPlugins.length > 0) {
                    const suggestions = similarPlugins.map(p => `- ${p.name}`).join("\n");
                    return interaction.reply({
                        flags: MessageFlags.EPHEMERAL,
                        content: `Couldn't find plugin "${pluginName}". Did you mean one of these?\n${suggestions}`
                    });
                }

                return interaction.reply({
                    flags: MessageFlags.EPHEMERAL,
                    content: `Plugin "${pluginName}" not found.`
                });
            }

            interaction.reply(buildPluginInfoMessage(plugin));
        },

        async autoComplete(interaction) {
            const focusedValue = String(interaction.data.options.getFocused(true).value).toLowerCase();

            const plugins = await fetchPlugins();

            const matchingPlugins = plugins
                .filter(p => p.name.toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map(p => ({
                    name: p.name,
                    value: p.name
                }));

            interaction.result(matchingPlugins);
        }
    }
);
