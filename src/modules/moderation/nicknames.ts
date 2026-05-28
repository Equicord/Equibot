import { Member } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";
import { silently } from "~/util/functions";

export async function moderateNick(member: Member) {
    if (member.bot || !member.guild.permissionsOf(Vaius.user.id).has("MANAGE_NICKNAMES")) return;

    const ignoredRoles = [Config.roles.mod, Config.roles.helper];
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
