import { Member } from "oceanic.js";
import Config from "~/config";
import { Vaius } from "../Client";

let cachedEquicordDevs: Set<string> | null = null;
let cachedVencordDevs: Set<string> | null = null;
let lastFetched = 0;

async function getDevIDs() {
    const now = Date.now();
    if (cachedEquicordDevs && cachedVencordDevs && now - lastFetched < 24 * 60 * 60 * 1000) {
        return { equicord: cachedEquicordDevs, vencord: cachedVencordDevs };
    }

    const res = await fetch("https://raw.githubusercontent.com/Equicord/Equibored/main/devs.json");
    if (!res.ok) throw new Error();
    const json = await res.json();

    cachedEquicordDevs = new Set(Object.values(json.equicord).map((dev: any) => dev.id));
    cachedVencordDevs = new Set(Object.values(json.vencord).map((dev: any) => dev.id));
    lastFetched = now;

    return { equicord: cachedEquicordDevs, vencord: cachedVencordDevs };
}

async function checkIfDev(member: Member) {
    const { contributor, vencordContrib } = Config.roles;
    try {
        const { equicord, vencord } = await getDevIDs();
        const rolesToAdd: string[] = [];

        if (equicord.has(member.id)) rolesToAdd.push(contributor);
        if (vencord.has(member.id)) rolesToAdd.push(vencordContrib);

        if (rolesToAdd.length > 0) {
            try {
                await member.edit({
                    roles: [...member.roles, ...rolesToAdd],
                    reason: "Identified as Equicord/Vencord contributor"
                });
            } catch (err) { }
        }
    } catch (err) { }
}

export function initDevListeners() {
    Vaius.on("guildMemberAdd", checkIfDev);
}
