import { CreateMessageOptions } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";

export function logAutoModAction(data: string | CreateMessageOptions) {
    if (!Config.channels.autoModLog) return;

    if (typeof data === "string") {
        data = { content: data };
    }

    Vaius.rest.channels.createMessage(Config.channels.autoModLog, data);
}

export function logBadgeAction(type: string, user: { mention: string; }, badge: { tooltip: string; badge: string; }, editedBadge?: { tooltip: string; badge: string; }, newUser?: { mention: string; }) {
    if (!Config.channels.autoModLog) return;

    let message = `${type} badge:\nUser: ${user.mention}\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}`;

    if (type === "Edited") {
        message = `${type} badge\nfrom:\nUser: ${user.mention}\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}\nto:\nUser: ${user.mention}\nTooltip: ${editedBadge?.tooltip}\nUrl: ${editedBadge?.badge}`;
    }

    if (type === "Copied" || type === "Moved") {
        message = `${type} badge\nfrom:\nUser: ${user.mention}\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}\nto:\nUser: ${newUser?.mention}\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}`;
    }

    Vaius.rest.channels.createMessage(Config.channels.autoModLog, { content: message });
}


export function logModerationAction(data: string | CreateMessageOptions) {
    if (!Config.channels.modLog) return;

    if (typeof data === "string") {
        data = { content: data };
    }

    Vaius.rest.channels.createMessage(Config.channels.modLog, data);
}
