import { defineCommand } from "~/Commands";
import { UserFlagNames } from "~/constants";
import { resolveUser } from "~/util/resolvers";

function getBadges(flags: number): string[] {
    const badges: string[] = [];
    for (const [flag, name] of Object.entries(UserFlagNames)) {
        if (flags & Number(flag)) {
            badges.push(name);
        }
    }
    return badges;
}

defineCommand({
    name: "userinfo",
    aliases: ["ui", "user", "u"],
    description: "Display information about a user",
    usage: "[user]",
    guildOnly: true,
    async execute({ msg, reply }, userResolvable) {
        const user = userResolvable
            ? await resolveUser(userResolvable).catch(() => null)
            : msg.author;

        if (!user) {
            return reply("User not found.");
        }

        const member = await msg.guild.getMember(user.id).catch(() => null);

        let roleColor = 0x5865F2;

        const avatarUrl = member?.avatarURL("png", 256) ?? user.avatarURL("png", 256);
        const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);

        const username = user.discriminator && user.discriminator !== "0"
            ? `${user.username}#${user.discriminator}`
            : user.username;

        const badges = getBadges(user.publicFlags);
        if (user.bot) badges.push("Bot");

        const fields: Array<{ name: string; value: string; inline?: boolean }> = [
            {
                name: "Username",
                value: username,
                inline: true,
            },
            {
                name: "User ID",
                value: user.id,
                inline: true,
            },
            {
                name: "Account Created",
                value: `<t:${createdTimestamp}:R> (<t:${createdTimestamp}:F>)`,
                inline: false,
            },
        ];

        if (member) {
            if (member.nick) {
                fields.push({
                    name: "Nickname",
                    value: member.nick,
                    inline: true,
                });
            }

            if (member.joinedAt) {
                const joinedTimestamp = Math.floor(member.joinedAt.getTime() / 1000);
                fields.push({
                    name: "Joined Server",
                    value: `<t:${joinedTimestamp}:R> (<t:${joinedTimestamp}:F>)`,
                    inline: false,
                });
            }

            const roles = member.roles
                .map(id => msg.guild.roles.get(id))
                .filter(r => r && r.name !== "@everyone")
                .sort((a, b) => b!.position - a!.position);

            roleColor = roles.find(r => r!.color)?.color ?? 0x5865F2;

            if (roles.length > 0) {
                const mentions = roles.map(r => `<@&${r!.id}>`);
                const roleList = mentions.length > 20
                    ? mentions.slice(0, 20).join(", ") + ` +${mentions.length - 20} more`
                    : mentions.join(", ");

                fields.push({
                    name: `Roles (${roles.length})`,
                    value: roleList,
                    inline: false,
                });
            }

            if (member.premiumSince) {
                const boostTimestamp = Math.floor(member.premiumSince.getTime() / 1000);
                fields.push({
                    name: "Boosting Since",
                    value: `<t:${boostTimestamp}:R> (<t:${boostTimestamp}:F>)`,
                    inline: false,
                });
            }
        }

        if (badges.length > 0) {
            fields.push({
                name: "Badges",
                value: badges.join(", "),
                inline: false,
            });
        }

        return reply({
            embeds: [{
                color: member ? roleColor : 0x5865F2,
                thumbnail: { url: avatarUrl },
                fields,
            }],
        });
    },
});
