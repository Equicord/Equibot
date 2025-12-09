import { Member } from "oceanic.js";
import Config from "~/config";
import { Vaius } from "../Client";

let cachedEquicordDevs: Set<string> | null = null;
let cachedVencordDevs: Set<string> | null = null;
let cachedDonors: Set<string> | null = null;
let lastFetched = 0;

const DEVS_JSON = "https://raw.githubusercontent.com/Equicord/Equibored/main/devs.json";
const BADGES_JSON = "https://raw.githubusercontent.com/Equicord/Equibored/main/badges.json";

async function getDevAndBadgeIDs() {
    const now = Date.now();

    if (
        cachedEquicordDevs &&
        cachedVencordDevs &&
        cachedDonors &&
        now - lastFetched < 3 * 60 * 60 * 1000
    ) {
        return {
            equicord: cachedEquicordDevs,
            vencord: cachedVencordDevs,
            donors: cachedDonors
        };
    }

    const devRes = await fetch(DEVS_JSON);
    if (!devRes.ok) throw new Error("Failed to fetch dev IDs");
    const devJson = await devRes.json();

    cachedEquicordDevs = new Set(Object.values(devJson.equicord).map((dev: any) => dev.id));
    cachedVencordDevs = new Set(Object.values(devJson.vencord).map((dev: any) => dev.id));

    const badgeRes = await fetch(BADGES_JSON);
    if (!badgeRes.ok) throw new Error("Failed to fetch badge users");
    const badgeJson = await badgeRes.json();

    cachedDonors = new Set(Object.keys(badgeJson)!);

    lastFetched = now;

    return {
        equicord: cachedEquicordDevs!,
        vencord: cachedVencordDevs!,
        donors: cachedDonors!
    };
}

async function checkIfDevOrDonor(member: Member) {
    if (member.bot) return;

    const { contributor, vencordContrib, donor } = Config.roles;
    try {
        const { equicord, vencord, donors } = await getDevAndBadgeIDs();
        const rolesToAdd: string[] = [];

        if (equicord.has(member.id)) rolesToAdd.push(contributor);
        if (vencord.has(member.id)) rolesToAdd.push(vencordContrib);
        if (donors.has(member.id)) rolesToAdd.push(donor);

        if (rolesToAdd.length > 0) {
            try {
                const newRoles = rolesToAdd.filter(role => !member.roles.includes(role));

                await member.edit({
                    roles: [...member.roles, ...newRoles],
                    reason: "Acknowledged as a Contributor and/or Donor"
                });
            } catch (err) { }
        }
    } catch (err) { }
}

export function initRoleListeners() {
    Vaius.on("guildMemberAdd", checkIfDevOrDonor);
    Vaius.on("guildMemberUpdate", checkIfDevOrDonor);
}
