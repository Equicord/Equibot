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

export function logBadgeAction(type: string, user: { mention: string; }, badge: { tooltip: string; badge: string; }) {
    if (!Config.channels.autoModLog) return;

    const message = `${type} badge:\nTooltip: ${badge.tooltip}\nUrl: ${badge.badge}\nUser: ${user.mention}`;

    Vaius.rest.channels.createMessage(Config.channels.autoModLog, { content: message });
}


export function logModerationAction(data: string | CreateMessageOptions) {
    if (!Config.channels.modLog) return;

    if (typeof data === "string") {
        data = { content: data };
    }

    Vaius.rest.channels.createMessage(Config.channels.modLog, data);
}
