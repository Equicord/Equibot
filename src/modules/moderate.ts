import { AutoModerationActionTypes, Member } from "oceanic.js";

import { silently } from "~/util/functions";
import { logModerationAction } from "~/util/logAction";
import { Vaius } from "../Client";

export async function moderateNick(member: Member) {
    if (member.bot || !member.guild.permissionsOf(Vaius.user.id).has("MANAGE_NICKNAMES")) return;

    const name = member.displayName;
    const normalizedName = name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9 ]/g, "")
        .trim()
        || member.username.replace(/[^A-Za-z0-9 ]/g, "").trim()
        || "unknown username";

    if (name !== normalizedName)
        silently(member.edit({ nick: normalizedName }));
}

export function initModListeners() {
    Vaius.on("guildMemberUpdate", moderateNick);
    Vaius.on("guildMemberAdd", moderateNick);

    Vaius.on("autoModerationActionExecution", async (guild, channel, user, data) => {
        if (data.action.type !== AutoModerationActionTypes.SEND_ALERT_MESSAGE) return;

        const includesPing = ["@everyone", "@here"].some(s => data.content.includes(s));

        const isSteamScam = (["[steamcommunity.com", "$ gift"].some(s => data.content.includes(s))) &&
            ["https://u.to", "https://sc.link", "https://e.vg", "https://is.gd"].some(s => data.content.includes(s));

        const isMediaFireScam = data.content.includes("bro") && data.content.includes("mediafire") && data.content.includes("found");

        const isRobloxScam = data.content.includes("executor") && ["roblox", "free"].some(s => data.content.includes(s));

        const isMrBeastScam = data.content.match(/\/[1-4]\.(jpe?g|gif|png|webp)/g)?.length! >= 2 ||
            (includesPing && new RegExp(String.raw`(https://(cdn|media)\.discordapp\.(net|com)/attachments/\d+/\d+/image\.(jpe?g|gif|png|webp)(\?\S+)?[\s\n]*){3,4}`).test(data.content));

        const isScam = isSteamScam || isMediaFireScam || isRobloxScam || isMrBeastScam;

        if (isScam) {
            await Vaius.rest.guilds.createBan(guild.id, user.id, {
                reason: `scams (hacked account): ${data.content}`,
                deleteMessageDays: 1
            });
            logModerationAction(`Banned <@${user.id}> for posting a scam message.`);
            return;
        }
    });
}
