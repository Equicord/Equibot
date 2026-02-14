import { Message } from "oceanic.js";
import { Vaius } from "~/Client";
import { isTruthy } from "~/util/guards";
import { moderateInvites } from "./invites";
import { moderateMultiChannelSpam } from "./multiChannelSpam";
import { ocrModerate } from "./ocr";
import { moderateSuspiciousFiles } from "./suspiciousFiles";
import { moderateSuspiciousLinks } from "./suspiciousLinks";

export async function moderateMessage(msg: Message, isEdit: boolean) {
    if (msg.author.bot) return;
    if (!msg.inCachedGuildChannel()) return;
    if (!msg.channel.permissionsOf(Vaius.user.id).has("MANAGE_MESSAGES")) return;

    // FIXME: make this less bad
    if (msg.messageSnapshots?.length)
        msg.content = msg.messageSnapshots[0].message?.content || msg.content;

    if (msg.member?.permissions.has("MANAGE_MESSAGES")) return;

    const moderationFunctions = [
        !isEdit && moderateMultiChannelSpam,
        moderateInvites,
        moderateSuspiciousFiles,
        moderateSuspiciousLinks,
        ocrModerate
    ].filter(isTruthy);

    for (const moderate of moderationFunctions) {
        if (await moderate(msg)) return;
    }
}
