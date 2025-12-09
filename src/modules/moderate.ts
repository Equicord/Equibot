import { spawn } from "child_process";
import { AnyTextableGuildChannel, AutoModerationActionTypes, EmbedOptions, Member, Message } from "oceanic.js";

import { reply } from "~/util/discord";
import { silently } from "~/util/functions";
import { until } from "~/util/time";

import Config from "~/config";
import { isTruthy } from "~/util/guards";
import { logAutoModAction } from "~/util/logAction";
import { handleError } from "..";
import { Vaius } from "../Client";
import { Millis } from "../constants";

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
    }, 15 * Millis.SECOND);

    if (channelsMessaged.size < 3) return false;

    await msg.member.edit({
        communicationDisabledUntil: until(1 * Millis.HOUR),
        reason: "Messaged >=3 different channels within 15 seconds"
    });

    logAutoModAction({
        content: `Muted <@${msg.author.id}> for messaging >=3 different channels within 15 seconds`,
        embeds: [makeEmbedForMessage(msg)]
    });

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
        moderateInvites,
        moderateSuspiciousFiles
    ].filter(isTruthy);

    for (const moderate of moderationFunctions) {
        if (await moderate(msg)) return;
    }
}

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

const inviteRe = /discord(?:(?:app)?\.com\/invite|\.gg)\/([a-z0-9-]+)/ig;
const allowedGuilds = new Set([
    Config.homeGuildId,
    ...Config.moderation.inviteAllowedGuilds
]);

async function getInviteImage(code: string) {
    const res = await fetch(`https://invidget.switchblade.xyz/${code}`);
    if (!res.ok) return null;

    const svgText = await res.text()
        .then(text => text.replace("image/jpg", "image/jpeg")); // https://github.com/SwitchbladeBot/invidget/pull/82

    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        const proc = spawn("rsvg-convert", ["-z", "2"]);

        proc.stdout.on("data", chunk => chunks.push(chunk));
        proc.on("close", code =>
            code === 0
                ? resolve(Buffer.concat(chunks))
                : reject(new Error(`rsvg-convert exited with code ${code}`))
        );
        proc.on("error", reject);

        proc.stdin.write(svgText);
        proc.stdin.end();
    });
}

export async function moderateInvites(msg: Message) {
    if (!Config.moderation.invites) return false;

    for (const [, code] of msg.content.matchAll(inviteRe)) {
        const inviteData = await Vaius.rest.channels.getInvite(code, {}).catch(() => null);
        if (!inviteData?.guildID || !inviteData.guild) continue;

        if (!allowedGuilds.has(inviteData.guildID)) {
            silently(msg.delete());
            silently(msg.member!.edit({ communicationDisabledUntil: until(5 * Millis.MINUTE), reason: "invite" }));

            const inviteImage = await getInviteImage(code);
            logAutoModAction({
                content: `${msg.author.mention} posted an invite to ${inviteData.guild.name} in ${msg.channel!.mention}`,
                embeds: [{
                    ...makeEmbedForMessage(msg),
                    image: inviteImage ? { url: "attachment://invite.png" } : void 0
                }],
                files: inviteImage ? [{ name: "invite.png", contents: inviteImage }] : void 0
            });

            return true;
        }
    }

    return false;
}

// Vencord.Webpack.find(m => Array.isArray(m) && m.includes("exe"))
const suspiciousFileExtensions = new Set<string>(JSON.parse('["7z","ade","adp","arj","apk","application","appx","appxbundle","asx","bas","bat","cab","cer","chm","cmd","cnt","cpl","crt","csh","deb","der","diagcab","dll","dmg","docm","dotm","ex","ex_","exe","fxp","gadget","grp","gz","hlp","hpj","hta","htc","inf","ins","ipa","iso","isp","its","jar","jnlp","jse","ksh","lib","lnk","mad","maf","mag","mam","maq","mar","mas","mat","mau","mav","maw","mcf","mda","mdb","mde","mdt","mdw","mdz","msc","msh","msh1","msh1xml","msh2","msh2xml","mshxml","msi","msix","msixbundle","msp","mst","msu","nsh","ops","osd","pcd","pif","pkg","pl","plg","potm","ppam","ppsm","pptm","prf","prg","printerexport","ps1","ps1xml","ps2","ps2xml","psc1","psc2","psd1","psdm1","pst","py","pyc","pyo","pyw","pyz","pyzw","rar","reg","rpm","scf","scr","sct","shb","shs","sldm","sys","theme","tmp","url","vb","vbe","vbp","vbs","vhd","vhdx","vsmacros","vsw","vxd","webpnp","ws","wsc","wsf","wsh","xbap","xlam","xll","xlsm","xltm","xnk","z","zip"]'));

async function moderateSuspiciousFiles(msg: Message<AnyTextableGuildChannel>) {
    if (msg.member.roles.includes(Config.roles.regular) || msg.member.roles.includes(Config.roles.fileWhitelist)) return false;

    for (const attachment of msg.attachments.values()) {
        const ext = attachment.filename?.split(".").pop()?.toLowerCase();
        if (!ext || !suspiciousFileExtensions.has(ext)) continue;

        silently(msg.delete());
        silently(msg.member!.edit({ communicationDisabledUntil: until(10 * Millis.MINUTE), reason: "suspicious file attachment" }));
        logAutoModAction(`${msg.author.mention} posted a suspicious file (${attachment.filename}) in ${msg.channel!.mention}`);

        return true;
    }

    return false;
}

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
export async function lobotomiseMaybe(msg: Message<AnyTextableGuildChannel>) {
    if (!msg.referencedMessage || msg.content !== "mods crush this person's skull") return false;

    try {
        await msg.referencedMessage.member!.edit({
            communicationDisabledUntil: until(10 * Millis.MINUTE),
            reason: "showing screenshot of automodded message"
        });

        silently(msg.referencedMessage.delete());

        silently(reply(msg, {
            content: "Lobotomised! 🔨"
        }));

        return true;
    } catch (e) {
        handleError(`Failed to lobotomise ${msg.referencedMessage.member?.id}`, e);
        return false;
    }
}
