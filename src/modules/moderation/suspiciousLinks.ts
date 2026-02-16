import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Emoji, Millis } from "~/constants";
import { silently } from "~/util/functions";
import { isTruthy } from "~/util/guards";
import { logAutoModAction, logDevDebug } from "~/util/logAction";
import { checkDomainBlocked, extractDomains } from "~/util/dns";
import { until } from "~/util/time";

// Whitelisted domains that should never be blocked
const WHITELISTED_DOMAINS = new Set([
    // Discord
    "discord.com",
    "discord.gg",
    "discordapp.com",
    "discord.media",
    "cdn.discordapp.com",
    "media.discordapp.net",
    // Equicord/Vencord related
    "equicord.org",
    "vencord.dev",
    "github.com",
    "github.io",
    "githubusercontent.com",
    // Common safe domains
    "google.com",
    "youtube.com",
    "youtu.be",
    "twitter.com",
    "x.com",
    "reddit.com",
    "stackoverflow.com",
    "stackoverflow.blog",
    "npmjs.com",
    "nodejs.org"
]);

export async function moderateSuspiciousLinks(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (!msg.member || "MANAGE_MESSAGES" in msg.member.permissions) return false;
    if (msg.member.roles.includes(Config.roles.regular)) return false;

    const domains = extractDomains(msg.content);
    if (domains.length === 0) return false;

    // Filter out whitelisted domains (including parent domains)
    const allDomainsToCheck = new Set<string>();
    for (const domain of domains) {
        const parts = domain.split(".");
        while (parts.length > 1) {
            const parentDomain = parts.join(".");
            if (!WHITELISTED_DOMAINS.has(parentDomain)) {
                allDomainsToCheck.add(parentDomain);
            }
            parts.shift();
        }
    }
    if (allDomainsToCheck.size === 0) return false;

    // Check each domain against Cloudflare Family DNS
    const blockedDomains = (await Promise.all(
        [...allDomainsToCheck].map(async domain => {
            try {
                const result = await checkDomainBlocked(domain);
                return result.blocked ? domain : null;
            } catch (e) {
                logDevDebug(`Failed to check domain ${domain}: ${e}`);
                return null;
            }
        })
    )).filter(isTruthy);

    if (blockedDomains.length === 0) return false;

    silently(msg.delete("Suspicious link"));

    silently(msg.guild.editMember(msg.author.id, {
        communicationDisabledUntil: until(1 * Millis.HOUR),
        reason: "Posted suspicious link(s)"
    }));

    const domainList = blockedDomains.map(d => `\`${d}\``).join(", ");

    logAutoModAction({
        content: `${Emoji.Boot} ${msg.member.mention} posted blocked link(s) in ${msg.channel.mention} and has been timed out for 1 hour`,
        embeds: [{
            author: {
                name: msg.member.tag,
                iconURL: msg.member.avatarURL()
            },
            title: "Blocked Domains",
            description: domainList,
            fields: [{
                name: "Message Content",
                value: msg.content.slice(0, 1000) || "*No content*"
            }]
        }]
    });

    return true;
}
