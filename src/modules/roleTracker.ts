import { Member } from "oceanic.js";
import Config from "~/config";
import { Millis } from "~/constants";
import { fetchJsons } from "~/util/fetch";
import { Vaius } from "../Client";

let cachedEquicordDevs: Set<string> | null = null;
let cachedVencordDevs: Set<string> | null = null;
let cachedDonors: Set<string> | null = null;
let lastFetched = 0;

const DEVS_JSON = "https://raw.githubusercontent.com/Equicord/Equibored/main/devs.json";
const DONORS_JSON = "https://raw.githubusercontent.com/Equicord/Equibored/main/badges.json";

async function getDevAndBadgeIDs() {
    const now = Date.now();

    if (cachedEquicordDevs && cachedVencordDevs && cachedDonors && now - lastFetched < 3 * Millis.HOUR) {
        return {
            equicord: cachedEquicordDevs,
            vencord: cachedVencordDevs,
            donors: cachedDonors
        };
    }

    const [devs, donors] = await fetchJsons([DEVS_JSON, DONORS_JSON]);

    cachedEquicordDevs = new Set(Object.values(devs.equicord).map((dev: any) => dev.id));
    cachedVencordDevs = new Set(Object.values(devs.vencord).map((dev: any) => dev.id));
    cachedDonors = new Set(Object.keys(donors)!);

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
