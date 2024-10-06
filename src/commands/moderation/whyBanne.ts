import { defineCommand } from "~/Commands";
import { codeblock, reply } from "~/util";
import { resolveUser } from "~/util/resolvers";

defineCommand({
    name: "whybanne",
    description: "Why Banne?",
    aliases: ["wb", "whybanned", "banreason", "baninfo", "bi"],
    guildOnly: true,
    usage: "<user>",
    async execute(msg, userResolvable) {
        const user = await resolveUser(userResolvable).catch(() => null);
        if (!user) {
            return reply(msg, "who?");
        }

        const ban = await msg.guild.getBan(user.id).catch(() => null);
        if (!ban) {
            return reply(msg, "bro is not banne");
        }

        let reason = ban.reason || "No reason provided";
        let actor = "idk who";

        // ban command uses reason format like `actor: reason`
        const splitReason = ban.reason?.split(" ");
        if (splitReason?.[0].endsWith(":")) {
            actor = splitReason[0].slice(0, -1);
            reason = splitReason.slice(1).join(" ");
        }

        reply(msg, `Banned by **${actor}**: ${codeblock(reason)}`);
    },
});
