import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { isTruthy } from "~/util/guards";
import { moderateInvites } from "./invites";
import { moderateMultiChannelSpam } from "./multiChannelSpam";
import { moderateNSFW } from "./nsfw";
import { ocrModerate } from "./ocr";
import { moderateSuspiciousFiles } from "./suspiciousFiles";

export async function moderateMessage(msg: Message, isEdit: boolean) {
    if (msg.author.bot) return;
    if (!msg.guildID) return;

    // FIXME: make this less bad
    if (msg.messageSnapshots?.length)
        msg.content = msg.messageSnapshots[0].message?.content || msg.content;

    if (msg.member?.permissions.has("MANAGE_MESSAGES")) return;

    const moderationFunctions = [
        !isEdit && moderateMultiChannelSpam,
        moderateInvites,
        moderateSuspiciousFiles,
        ocrModerate,
        moderateNSFW,
    ].filter(isTruthy);

    for (const moderate of moderationFunctions) {
        if (await moderate(msg as Message<AnyTextableGuildChannel>)) return;
    }
}
