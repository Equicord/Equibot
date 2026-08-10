import { CreateMessageOptions } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";

function logAction(channelId: string, data: string | CreateMessageOptions) {
    if (!channelId) return;

    if (typeof data === "string") {
        data = { content: data };
    }

    return Vaius.rest.channels.createMessage(channelId, data);
}

const makeLogger = (channelId: string): ActionLogger => logAction.bind(null, channelId);

export type ActionLogger = (data: string | CreateMessageOptions) => ReturnType<typeof logAction>;

export const logDevDebug = makeLogger(Config.channels.dev);
export const logAutoModAction = makeLogger(Config.channels.autoModLog);
export const logBotAuditAction = makeLogger(Config.channels.botAuditLog);
export const logModerationAction = makeLogger(Config.channels.modLog);

export function logBadgeAction(type: string, user: { mention: string; }, badge: { tooltip: string; badge: string; }, editedBadge?: { tooltip: string; badge: string; }, newUser?: { mention: string; }, file?: { name: string, contents: Buffer<ArrayBuffer>; }) {
    if (!Config.channels.botAuditLog) return;

    let message = `${type} badge:\nUser: ${user.mention}\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}`;

    if (type === "Edited") {
        message = `${type} badge\nfrom:\nUser: ${user.mention}\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}\nto:\nUser: ${user.mention}\nTooltip: ${editedBadge?.tooltip}\nUrl: ${editedBadge?.badge}`;
    }

    if (type === "Copied" || type === "Moved") {
        message = `${type} badge\nfrom:\nUser: ${user.mention}\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}\nto:\nUser: ${newUser?.mention}\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}`;
    }

    const options: any = { content: message };

    if (file) {
        options.files = [{
            name: file.name,
            contents: file.contents
        }];
    }

    Vaius.rest.channels.createMessage(Config.channels.autoModLog, options);
}
