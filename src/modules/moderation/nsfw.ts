import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Emoji, Millis } from "~/constants";
import { fetchBuffer } from "~/util/fetch";
import { silently } from "~/util/functions";
import { isTruthy } from "~/util/guards";
import { logAutoModAction } from "~/util/logAction";
import { detectNSFW } from "~/util/nsfw";
import { until } from "~/util/time";

export async function moderateNSFW(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (!msg.member || msg.member.roles.includes(Config.roles.regular)) return false;

    const attachments = msg.attachments.filter(att => att.contentType?.startsWith("image/"));
    if (attachments.length === 0) return false;

    const flaggedAttachment = (await Promise.all(attachments.map(async att => {
        try {
            const buf = await fetchBuffer(att.url);
            const results = await detectNSFW(buf);
            const nsfwResult = results.find(r => r.label === "nsfw");
            return nsfwResult && nsfwResult.score > 0.85 ? buf : null;
        } catch (e) {
            return null;
        }
    }))).find(isTruthy);

    if (!flaggedAttachment) return false;

    silently(msg.delete("NSFW image"));

    silently(msg.guild.editMember(msg.author.id, {
        communicationDisabledUntil: until(1 * Millis.HOUR),
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
