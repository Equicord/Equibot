import { Message } from "oceanic.js";
import { Millis } from "~/constants";
import { handleError } from "~/index";
import { reply } from "~/util/discord";
import { silently } from "~/util/functions";
import { until } from "~/util/time";

export async function lobotomiseMaybe(msg: Message) {
    if (!msg.referencedMessage || msg.content !== "mods crush this person's skull") return false;

    try {
        await msg.referencedMessage.member!.edit({
            communicationDisabledUntil: until(10 * Millis.MINUTE),
            reason: "skull crushed"
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
