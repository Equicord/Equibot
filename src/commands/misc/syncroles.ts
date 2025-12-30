import { Member } from "oceanic.js";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { fetchJsons } from "~/util/fetch";

const DEVS_JSON = "https://raw.githubusercontent.com/Equicord/Equibored/main/devs.json";
const DONORS_JSON = "https://raw.githubusercontent.com/Equicord/Equibored/main/badges.json";

async function getDevAndBadgeIDs() {
    const [devs, donors] = await fetchJsons([DEVS_JSON, DONORS_JSON]);

    const equicord = new Set(
        Object.values(devs.equicord)
            .map((d: any) => String(d.id))
            .filter(id => id !== "0" && id !== "0n")
    );

    const vencord = new Set(
        Object.values(devs.vencord)
            .map((d: any) => String(d.id))
            .filter(id => id !== "0" && id !== "0n")
    );

    const donorsSet = new Set(
        Object.keys(donors)
            .map(String)
            .filter(id => id !== "0" && id !== "0n")
    );

    return { equicord, vencord, donors: donorsSet };
}

async function applyDevDonorRoles(
    member: Member,
    ids: Awaited<ReturnType<typeof getDevAndBadgeIDs>>
) {
    if (member.bot) return false;

    const { contributor, vencordContrib, donor } = Config.roles;
    const { equicord, vencord, donors } = ids;
    const rolesToAdd: string[] = [];

    if (equicord.has(member.id) && !member.roles.includes(contributor)) rolesToAdd.push(contributor);
    if (vencord.has(member.id) && !member.roles.includes(vencordContrib)) rolesToAdd.push(vencordContrib);
    if (donors.has(member.id) && !member.roles.includes(donor)) rolesToAdd.push(donor);
    if (!rolesToAdd.length) return false;

    await member.edit({
        roles: [...member.roles, ...rolesToAdd],
        reason: "Manually synced contributor/donor roles"
    });

    return true;
}

defineCommand({
    name: "syncroles",
    aliases: ["syncrole", "applyroles", "sr", "ar"],
    description: "Applies Equicord/Vencord contributor and donor roles to all listed users in this guild.",
    usage: null,
    guildOnly: true,
    modOnly: true,

    async execute({ msg, reply }) {
        const { guild } = msg;
        if (!guild) return;

        let applied = 0;
        let skipped = 0;
        let failed = 0;
        let ids;

        try {
            ids = await getDevAndBadgeIDs();
        } catch {
            return reply("Failed to fetch dev/donor data.");
        }

        const allIDs = new Set([
            ...ids.equicord,
            ...ids.vencord,
            ...ids.donors
        ]);

        for (const userID of allIDs) {
            let member: Member;

            try {
                member = await guild.getMember(userID);
            } catch {
                skipped++;
                continue;
            }

            try {
                const updated = await applyDevDonorRoles(member, ids);
                if (updated) applied++;
                else skipped++;
            } catch {
                failed++;
            }
        }

        return reply(
            "Sync complete.\n" +
            `Applied: ${applied}\n` +
            `Skipped: ${skipped}\n` +
            `Failed: ${failed}`
        );
    },
});
