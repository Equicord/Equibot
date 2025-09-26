import leven from "leven";
import { ActionRow, Button, ButtonStyles, ComponentMessage, Container, TextDisplay } from "~components";

import { CommandContext, defineCommand } from "~/Commands";
import { EmojiName, getEmoji } from "~/modules/emojiManager";
import { makeCachedJsonFetch } from "~/util/fetch";
import { run } from "~/util/functions";

interface Plugin {
    name: string;
    description: string;
    tags: string[];
    authors: { name: string; id: string; }[];

    target?: "desktop" | "discordDesktop" | "web" | "dev";

    required: boolean;
    enabledByDefault: boolean;

    hasPatches: boolean;
    hasCommands: boolean;

    filePath: string;
}

interface Trait {
    emoji: EmojiName;
    name: string;
    shouldShow: boolean;
}

type PluginReadmes = Record<string, string>;

const fetchPlugins = makeCachedJsonFetch<Plugin[]>(
    "https://raw.githubusercontent.com/Equicord/Equibored/main/plugins.json"
);

async function sendPluginInfo({ reply }: CommandContext, plugin: Plugin) {
    const {
        name,
        description,
        required,
        enabledByDefault,
        hasCommands,
        target,
        filePath,
    } = plugin;

    const traits: Trait[] = [
        {
            emoji: "plugin_required",
            name: "This plugin is required",
            shouldShow: required,
        },
        {
            emoji: "plugin_default_enabled",
            name: "This plugin is enabled by default",
            shouldShow: enabledByDefault,
        },
        {
            emoji: "plugin_commands",
            name: "This plugin has chat commands",
            shouldShow: hasCommands,
        },
        {
            emoji: "plugin_desktop",
            name: "This plugin is desktop only",
            shouldShow: target === "desktop",
        },
        {
            emoji: "plugin_discord_desktop",
            name: "This plugin is discord desktop only",
            shouldShow: target === "discordDesktop",
        },
        {
            emoji: "plugin_web",
            name: "This plugin is web only",
            shouldShow: target === "web",
        },
        {
            emoji: "plugin_dev",
            name: "This plugin is development build only",
            shouldShow: target === "dev",
        },
    ];

    return reply(
        <ComponentMessage>
            <Container accentColor={0xdd7878}>
                <TextDisplay>## {name}</TextDisplay>
                <TextDisplay>{description}</TextDisplay>

                {traits.filter(t => t.shouldShow).map(t => (
                    <TextDisplay>{getEmoji(t.emoji)} {t.name}</TextDisplay>
                ))}

                <TextDisplay>-# Made by {plugin.authors.map(a => a.name).join(", ")}</TextDisplay>
                <ActionRow>
                    <Button style={ButtonStyles.LINK} url={`https://equicord.org/plugins/${encodeURIComponent(name)}`}>
                        View Website
                    </Button>
                    <Button style={ButtonStyles.LINK} url={`https://github.com/Equicord/Equicord/blob/main/${filePath}`}>
                        View Source
                    </Button>
                </ActionRow>
            </Container>
        </ComponentMessage>
    );
}

defineCommand({
    name: "plugin",
    aliases: ["viewplugin", "p"],
    description: "Provides information on a plugin",
    usage: "<plugin name>",
    rawContent: true, // since we just want the plugin name, and at least one has spaces
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

        // find plugins with similar names, in case of minor typos
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
