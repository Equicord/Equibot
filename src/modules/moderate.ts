import { AnyTextableGuildChannel, AutoModerationActionTypes, EmbedOptions, Member, Message } from "oceanic.js";

import { isTruthy, silently } from "~/util/functions";
import { until } from "~/util/time";

import Config from "~/config";
import { Vaius } from "../Client";
import { Millis } from "../constants";

export function logModerationAction(content: string, ...embeds: EmbedOptions[]) {
    Vaius.rest.channels.createMessage(Config.channels.modLog, {
        content,
        embeds
    });
}

function makeEmbedForMessage(message: Message): EmbedOptions {
    return {
        author: {
            name: message.author.tag,
            iconURL: message.author.avatarURL()
        },
        description: message.content
    };
}

const channelsMessagedUserMap = new Map<string, Set<string>>();

async function moderateMultiChannelSpam(msg: Message<AnyTextableGuildChannel>) {
    let channelsMessaged = channelsMessagedUserMap.get(msg.author.id);
    if (!channelsMessaged) {
        channelsMessaged = new Set();
        channelsMessagedUserMap.set(msg.author.id, channelsMessaged);
    }

    channelsMessaged.add(msg.channelID);
    setTimeout(() => {
        const channelsMessaged = channelsMessagedUserMap.get(msg.author.id);
        if (channelsMessaged) {
            channelsMessaged.delete(msg.channelID);
            if (!channelsMessaged.size)
                channelsMessagedUserMap.delete(msg.author.id);
        }
    }, 5 * Millis.SECOND);

    if (channelsMessaged.size < 3) return false;

    await msg.member.edit({
        communicationDisabledUntil: until(1 * Millis.HOUR),
        reason: "Messaged >=3 different channels within 5 seconds"
    });

    logModerationAction(`Muted <@${msg.author.id}> for messaging >=3 different channels within 5 seconds`, makeEmbedForMessage(msg));

    await silently(msg.delete());

    return true;
}

export async function moderateMessage(msg: Message, isEdit: boolean) {
    if (!msg.inCachedGuildChannel()) return;
    if (!msg.channel.permissionsOf(Vaius.user.id).has("MANAGE_MESSAGES")) return;

    // FIXME: make this less bad
    if (msg.messageSnapshots?.length)
        msg.content = msg.messageSnapshots[0].message?.content || msg.content;

    if (msg.member?.permissions.has("MANAGE_MESSAGES")) return;

    const moderationFunctions = [
        !isEdit && moderateMultiChannelSpam,
    ].filter(isTruthy);

    for (const moderate of moderationFunctions) {
        if (await moderate(msg)) return;
    }
}

const HoistCharactersRegex = /^[!"#$%'+,.*-]+/;

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

        const isSteamScam = (["[steamcommunity.com", "$ gift"].some(s => data.content.includes(s))) &&
            ["https://u.to", "https://sc.link", "https://e.vg", "https://is.gd"].some(s => data.content.includes(s));

        const isMediaFireScam = data.content.includes("bro") && data.content.includes("mediafire") && data.content.includes("found");

        const isRobloxScam = data.content.includes("executor") && ["roblox", "free"].some(s => data.content.includes(s));

        const isScam = isSteamScam || isMediaFireScam || isRobloxScam;

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
