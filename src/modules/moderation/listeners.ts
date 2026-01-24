import { AutoModerationActionTypes } from "oceanic.js";
import { Vaius } from "~/Client";
import { Millis } from "~/constants";
import { logAutoModAction } from "~/util/logAction";
import { until } from "~/util/time";
import { moderateNick } from "./nicknames";

export function initModListeners() {
    Vaius.on("guildMemberUpdate", moderateNick);
    Vaius.on("guildMemberAdd", moderateNick);

    Vaius.on("autoModerationActionExecution", async (guild, channel, user, data) => {
        if (data.action.type !== AutoModerationActionTypes.SEND_ALERT_MESSAGE) return;

        const includesPing = ["@everyone", "@here"].some(s => data.content.includes(s));
        const includesInvite = ["discord.gg/", "discord.com/invite", "discordapp.com/invite"].some(s => data.content.includes(s));

        const isSteamScam = (["[steamcommunity.com", "$ gift"].some(s => data.content.includes(s))) &&
            ["https://u.to", "https://sc.link", "https://e.vg", "https://is.gd"].some(s => data.content.includes(s));

        const isMediaFireScam = data.content.includes("bro") && data.content.includes("mediafire") && data.content.includes("found");

        const isRobloxScam = data.content.includes("executor") && (
            includesInvite ||
            ["roblox", "free"].some(s => data.content.includes(s))
        );

        const isMrBeastScam = data.content.match(/\/[1-4]\.(jpe?g|gif|png|webp)/g)?.length! >= 2 ||
            (includesPing && new RegExp(String.raw`(https://(cdn|media)\.discordapp\.(net|com)/attachments/\d+/\d+/image\.(jpe?g|gif|png|webp)(\?\S+)?[\s\n]*){3,4}`).test(data.content));

        const isScam = isSteamScam || isMediaFireScam || isRobloxScam || isMrBeastScam;

        if (isScam) {
            await Vaius.rest.guilds.editMember(guild.id, user.id, {
                communicationDisabledUntil: until(1 * Millis.WEEK),
                reason: `scams (hacked account): ${data.content}`,
            });

            logAutoModAction(`Timed out <@${user.id}> for posting a scam message.`);
            return;
        }

        if (includesPing && includesInvite) {
            await Vaius.rest.guilds.createBan(guild.id, user.id, {
                reason: "tried to ping everyone with an invite (spam bot)",
                deleteMessageDays: 1
            });
            await Vaius.rest.guilds.removeBan(guild.id, user.id, "soft-ban");

            logAutoModAction(`Soft-banned <@${user.id}> for trying to ping everyone with an invite.`);
            return;
        }
    });
}
