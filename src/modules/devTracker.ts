import { Member } from "oceanic.js";
import { Vaius } from "../Client";

const EQUICORD_CONTRIB_ROLE = "1222677964760682556";
const VENCORD_CONTRIB_ROLE = "1173343399470964856";

let cachedEquicordDevs: Set<string> | null = null;
let cachedVencordDevs: Set<string> | null = null;
let lastFetched = 0;

async function getDevIDs() {
    const now = Date.now();
    if (cachedEquicordDevs && cachedVencordDevs && now - lastFetched < 24 * 60 * 60 * 1000) {
        return { equicord: cachedEquicordDevs, vencord: cachedVencordDevs };
    }

    const res = await fetch("https://raw.githubusercontent.com/Equicord/Equibored/main/devs.json");
    if (!res.ok) throw new Error(`Failed to fetch devs.json: ${res.status}`);
    const json = await res.json();

    cachedEquicordDevs = new Set(Object.values(json.equicord).map((dev: any) => dev.id));
    cachedVencordDevs = new Set(Object.values(json.vencord).map((dev: any) => dev.id));
    lastFetched = now;

    console.log("Equicord devs loaded:", Array.from(cachedEquicordDevs));
    console.log("Vencord devs loaded:", Array.from(cachedVencordDevs));

    return { equicord: cachedEquicordDevs, vencord: cachedVencordDevs };
}

async function checkIfDev(member: Member) {
    try {
        const { equicord, vencord } = await getDevIDs();
        const rolesToAdd: string[] = [];

        if (equicord.has(member.id)) rolesToAdd.push(EQUICORD_CONTRIB_ROLE);
        if (vencord.has(member.id)) rolesToAdd.push(VENCORD_CONTRIB_ROLE);

        if (rolesToAdd.length > 0) {
            try {
                await member.edit({
                    roles: [...member.roles, ...rolesToAdd],
                    reason: "Identified as Equicord/Vencord contributor"
                });
            } catch (e) {
                console.error("Failed to assign dev roles:", e);
            }
        }
    } catch (err) {
        console.error("Error checking dev IDs:", err);
    }
}

export function initDevListeners() {
    Vaius.on("guildMemberAdd", async member => {
        console.log("Member joined:", member.id, member.displayName);
        await checkIfDev(member);
    });
}
