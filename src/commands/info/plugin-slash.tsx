import { MessageFlags } from "oceanic.js";
import { registerChatInputCommand } from "~/SlashCommands";
import { CommandStringOption } from "~components";
import { fetchPlugins, buildPluginInfoMessage } from "./pluginUtils";

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
            const plugin = plugins.find(p => p.name.toLowerCase() === pluginName.toLowerCase());

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
