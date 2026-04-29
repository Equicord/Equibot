import { defineCommand } from "~/Commands";
import Config from "~/config";
import { drawRoleIcon } from "~/modules/regularCotd";
import { toHexColorString } from "~/util/text";
import { ComponentMessage, Container, MediaGallery, MediaGalleryItem, TextDisplay } from "~components";
import { Role, ROLE_ALIASES } from "../moderation/reroll";

defineCommand({
    name: "cotd",
    description: "Shows the current color of the day",
    usage: "[role]",
    guildOnly: true,
    async execute({ msg, reply }, roleArg?: string) {
        if (roleArg && !ROLE_ALIASES[roleArg.toLowerCase()]) {
            return reply(`Unknown role \`${roleArg}\`. Valid roles: ${Object.keys(ROLE_ALIASES).join(", ")}`);
        }

        const role: Role = roleArg ? ROLE_ALIASES[roleArg.toLowerCase()] : "regular";
        const roleId = role === "regular" ? Config.roles.regular : role === "mod" ? Config.roles.mod : Config.roles.donor;
        const guildRole = msg.guild!.roles.get(roleId)!;
        const color = toHexColorString(guildRole.colors.primaryColor);
        const image = await drawRoleIcon(color);

        let label = color;
        if (role === "regular") {
            const match = guildRole.name.match(/\((.+)\)/i);
            if (match) label = `${match[1]} (${color})`;
        }

        return reply(
            <ComponentMessage attachments={[]} files={[{ name: "duck.png", contents: image }]}>
                <Container accentColor={parseInt(color.slice(1), 16)}>
                    <TextDisplay>### Current {role} color of the day: {label}</TextDisplay>
                    <MediaGallery>
                        <MediaGalleryItem url="attachment://duck.png" />
                    </MediaGallery>
                </Container>
            </ComponentMessage>
        );
    }
});
