import { CreateMessageOptions } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";

function logAction(channelId: string, data: string | CreateMessageOptions) {
    if (!channelId) return;

    if (typeof data === "string") {
        data = { content: data };
    }

    Vaius.rest.channels.createMessage(channelId, data);
}

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

export const logAutoModAction = (data: string | CreateMessageOptions) => logAction(Config.channels.autoModLog, data);
export const logModerationAction = (data: string | CreateMessageOptions) => logAction(Config.channels.modLog, data);
export const logBotAuditAction = (data: string | CreateMessageOptions) => logAction(Config.channels.botAuditLog, data);
