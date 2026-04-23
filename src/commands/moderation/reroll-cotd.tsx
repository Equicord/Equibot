import { ButtonStyles, CreateMessageOptions, EditMessageOptions, User } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { drawRoleIcon, rerollCotd, rerollDonor, rerollMod } from "~/modules/regularCotd";
import { toHexColorString } from "~/util/text";
import { ActionRow, Button, ComponentMessage, Container, MediaGallery, MediaGalleryItem, TextDisplay } from "~components";

type Role = "regular" | "mod" | "donor";

const ROLE_ALIASES: Record<string, Role> = {
    regular: "regular",
    reg: "regular",
    r: "regular",
    color: "regular",
    colour: "regular",
    cotd: "regular",
    mod: "mod",
    moderator: "mod",
    helper: "mod",
    staff: "mod",
    donor: "donor",
    donator: "donor",
    supporter: "donor",
    sub: "donor",
};

async function reroll(role: Role, hex?: string, interactionUser?: User): Promise<CreateMessageOptions & EditMessageOptions> {
    const color = role === "regular" ? await rerollCotd(hex) : role === "mod" ? await rerollMod(hex) : await rerollDonor(hex);
    const image = await drawRoleIcon(color);

    return (
        // Passing empty attachments is a workaround for https://github.com/discord/discord-api-docs/issues/7529
        // FIXME: remove this when Discord fixes the issue
        <ComponentMessage attachments={[]} files={[{
            name: "blobcatcozy.png",
            contents: image
        }]}>
            <Container accentColor={parseInt(color.slice(1), 16)}>
                <TextDisplay>### New {role} color of the day: {color}</TextDisplay>
                <MediaGallery>
                    <MediaGalleryItem url="attachment://blobcatcozy.png" />
                </MediaGallery>

                {interactionUser && <TextDisplay>-# Last rerolled {`<t:${Math.round(Date.now() / 1000)}>`} by {interactionUser.mention}</TextDisplay>}

                <ActionRow>
                    <Button
                        style={ButtonStyles.SECONDARY}
                        customID={`reroll:${role}`}
                        disabled={hex != null}
                        emoji={{ name: Emoji.Die }}
                    >
                        Reroll again
                    </Button>
                </ActionRow>
            </Container>
        </ComponentMessage>
    );
}

function parseHex(hex: string): string | null {
    const parsed = Number(hex.replace(/^#/, "0x"));
    return isNaN(parsed) ? null : toHexColorString(parsed);
}

defineCommand({
    name: "reroll",
    description: "Rerolls the color of the day for a role",
    usage: "<role> [hex]",
    guildOnly: true,
    modOnly: true,
    async execute({ reply }, roleArg?: string, hex?: string) {
        if (!roleArg) {
            return reply(`Please specify a role. Valid roles: ${Object.keys(ROLE_ALIASES).join(", ")}`);
        }

        const role = ROLE_ALIASES[roleArg.toLowerCase()];

        if (!role) {
            return reply(`Unknown role \`${roleArg}\`. Valid roles: ${Object.keys(ROLE_ALIASES).join(", ")}`);
        }

        if (hex) {
            const parsed = parseHex(hex);
            if (!parsed) return reply("wtf is that hex");
            hex = parsed;
        }

        const result = await reroll(role, hex);
        return reply(result);
    }
});
