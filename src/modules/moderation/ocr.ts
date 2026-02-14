import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Emoji, Seconds } from "~/constants";
import { fetchBuffer } from "~/util/fetch";
import { checkPromise, silently } from "~/util/functions";
import { isTruthy } from "~/util/guards";
import { logAutoModAction } from "~/util/logAction";
import { readTextFromImage } from "~/util/ocr";
import { isSpamText } from "~/util/spamDetection";

const scamTerms = [
    "casino",
    "rakeback",
    "withdrawal",
    "bitcoin",
    "crypto"
];
const re = new RegExp(scamTerms.map(term => `\b${term}\b`).join("|"), "i");

interface FlaggedResult {
    buffer: Buffer;
    text: string;
    reason: string;
}

export async function ocrModerate(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (!msg.member || msg.member.roles.includes(Config.roles.regular)) return false;

    const attachments = msg.attachments.filter(att => att.contentType?.startsWith("image/"));
    if (attachments.length === 0) return false;

    const flaggedAttachment = (await Promise.all(attachments.map(async att => {
        try {
            const buf = await fetchBuffer(att.url);
            const text = await readTextFromImage(buf);

            // Check against scam term regex
            if (re.test(text)) {
                return { buffer: buf, text, reason: "Scam terms detected" };
            }

            // Check with spam detection model
            if (text.length >= 20 && await isSpamText(text)) {
                return { buffer: buf, text, reason: "Spam detected by AI" };
            }

            return null;
        } catch (e) {
            return null;
        }
    }))).find(isTruthy);

    if (!flaggedAttachment) return false;

    silently(msg.delete("Scam/spam message"));

    const didKick = await checkPromise(
        msg.member.ban({ reason: "Posted a scam/spam message (soft-ban)", deleteMessageSeconds: 1 * Seconds.DAY })
            .then(() => msg.member.unban("Soft-ban removal"))
    );

    let message = `${msg.member.mention} posted a scam/spam image in ${msg.channel.mention}`;
    if (didKick) {
        message = `${Emoji.Boot} ${message} and has been kicked`;
    }

    logAutoModAction({
        content: message,
        files: [{ contents: flaggedAttachment.buffer, name: "flagged.png" }],
        embeds: [{
            author: {
                name: msg.member.tag,
                iconURL: msg.member.avatarURL()
            },
            title: flaggedAttachment.reason,
            description: flaggedAttachment.text.slice(0, 500),
            image: { url: "attachment://flagged.png" }
        }]
    });

    return true;
}
