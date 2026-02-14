import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Emoji, Millis } from "~/constants";
import { silently } from "~/util/functions";
import { logAutoModAction } from "~/util/logAction";
import { isSpamText } from "~/util/spamDetection";
import { until } from "~/util/time";

export async function moderateSpam(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (!msg.member || msg.member.roles.includes(Config.roles.regular)) return false;

    const content = msg.content?.trim();
    if (!content) return false;

    // Skip very short messages (less likely to be spam, avoid false positives)
    if (content.length < 20) return false;

    const isSpam = await isSpamText(content);
    if (!isSpam) return false;

    silently(msg.delete("Spam message"));

    silently(msg.guild.editMember(msg.author.id, {
        communicationDisabledUntil: until(1 * Millis.HOUR),
        reason: "Posted spam message"
    }));

    logAutoModAction({
        content: `${Emoji.Boot} ${msg.member.mention} posted spam in ${msg.channel.mention} and has been timed out for 1 hour`,
        embeds: [{
            author: {
                name: msg.member.tag,
                iconURL: msg.member.avatarURL()
            },
            title: "Spam Detected",
            description: content.slice(0, 1000)
        }]
    });

    return true;
}
