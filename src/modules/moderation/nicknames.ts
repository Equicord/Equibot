import { Member } from "oceanic.js";
import { Vaius } from "~/Client";
import { silently } from "~/util/functions";
import Config from "~/config";

export async function moderateNick(member: Member) {
    if (member.bot || !member.guild.permissionsOf(Vaius.user.id).has("MANAGE_NICKNAMES")) return;

    const ignoredRoles = [Config.roles.team, Config.roles.mod];
    if (member.roles.some(role => ignoredRoles.includes(role))) return;

    const name = member.displayName;
    const normalizedName = name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9 ]/g, "")
        .trim()
        || member.username.replace(/[^A-Za-z0-9 ]/g, "").trim()
        || "unknown username";

    if (name !== normalizedName)
        silently(member.edit({ nick: normalizedName }));
}
