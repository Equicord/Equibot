import { ActionRow, Button, ButtonStyles, ComponentMessage, Container, TextDisplay } from "~components";
import { makeCachedJsonFetch } from "~/util/fetch";

export interface Plugin {
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
    name: string;
    shouldShow: boolean;
}

export const fetchPlugins = makeCachedJsonFetch<Plugin[]>(
    "https://raw.githubusercontent.com/Equicord/Equibored/main/plugins.json"
);

export function buildPluginInfoMessage(plugin: Plugin) {
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
            name: "This plugin is required",
            shouldShow: required,
        },
        {
            name: "This plugin is enabled by default",
            shouldShow: enabledByDefault,
        },
        {
            name: "This plugin has chat commands",
            shouldShow: hasCommands,
        },
        {
            name: "This plugin is desktop only",
            shouldShow: target === "desktop",
        },
        {
            name: "This plugin is discord desktop only",
            shouldShow: target === "discordDesktop",
        },
        {
            name: "This plugin is web only",
            shouldShow: target === "web",
        },
        {
            name: "This plugin is development build only",
            shouldShow: target === "dev",
        },
    ];

    return (
        <ComponentMessage>
            <Container accentColor={0x828282}>
                <TextDisplay>## {name}</TextDisplay>
                <TextDisplay>{description}</TextDisplay>

                {traits.filter(t => t.shouldShow).map(t => (
                    <TextDisplay>{t.name}</TextDisplay>
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
