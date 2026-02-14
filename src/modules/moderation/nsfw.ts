import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Emoji, Millis } from "~/constants";
import { fetchBuffer } from "~/util/fetch";
import { silently } from "~/util/functions";
import { logAutoModAction } from "~/util/logAction";
import { detectNSFW } from "~/util/nsfw";
import { until } from "~/util/time";

const NSFW_CONFIDENCE_THRESHOLD = 0.85;
const NSFW_TIMEOUT_DURATION = 1 * Millis.HOUR;

export async function moderateNSFW(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (!msg.member || msg.member.roles.includes(Config.roles.regular)) return false;

    const attachments = msg.attachments.filter(att => att.contentType?.startsWith("image/"));
    if (attachments.length === 0) return false;

    let flaggedAttachment: Buffer | null = null;
    for (const att of attachments) {
        try {
            const buf = await fetchBuffer(att.url);
            const results = await detectNSFW(buf);
            const nsfwResult = results.find(r => r.label === "nsfw");
            if (nsfwResult && nsfwResult.score > NSFW_CONFIDENCE_THRESHOLD) {
                flaggedAttachment = buf;
                break;
            }
        } catch (e) {
            console.error(`Failed to process attachment for NSFW detection: ${att.url}`, e);
        }
    }

    if (!flaggedAttachment) return false;

    silently(msg.delete("NSFW image"));

    silently(msg.guild.editMember(msg.author.id, {
        communicationDisabledUntil: until(NSFW_TIMEOUT_DURATION),
        reason: "Posted NSFW image"
    }));

    logAutoModAction({
        content: `${Emoji.Boot} ${msg.member.mention} posted an NSFW image in ${msg.channel.mention} and has been timed out for 1 hour`,
        files: [{ contents: flaggedAttachment, name: "flagged.png" }],
        embeds: [{
            author: {
                name: msg.member.tag,
                iconURL: msg.member.avatarURL()
            },
            image: { url: "attachment://flagged.png" }
        }]
    });

    return true;
}
