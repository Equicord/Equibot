import { AnyTextableGuildChannel, Message } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { DONOR_ROLE_ID, Emoji } from "~/constants";
import { ID_REGEX } from "~/util/discord";
import { makeConstants } from "~/util/objects";
import { toCodeblock } from "~/util/text";

import { hasHigherRoleThan } from "./utils";

const Aliases = makeConstants({
    d: DONOR_ROLE_ID,

    h: "1326406112144265257",
    f: "1230693249610547231",

    pm: "1305732092629356554",
    ec: "1222677964760682556",
    eb: "1287079931645263968",
    ds: "1331437433228623994",
    vc: "1173343399470964856",
    v: "1217667142598529064",

    nr: "1269861822077599765",
    nmm: "1302480459195879514",
    ns: "1290007556869062762",
    ny: "1319402584133468171"
});

function parseArgs(msg: Message<AnyTextableGuildChannel>, args: string[]) {
    const { guild, referencedMessage } = msg;

    let userStart = args.findIndex(a => ID_REGEX.test(a));
    if (userStart === -1) {
        if (!referencedMessage)
            return { role: "", users: [] };

        userStart = args.length;
    }

    const roleName = args.slice(0, userStart).join(" ").toLowerCase();
    const role = Aliases[roleName as keyof typeof Aliases]
        ?? guild.roles.find(r => r.name.toLowerCase() === roleName)?.id
        ?? guild.roles.find(r => r.name.toLowerCase().includes(roleName))?.id;

    const users = args.slice(userStart).map(u => u.match(ID_REGEX)?.[1]);
    if (!users.length)
        users.push(referencedMessage!.author.id);

    if (users.includes(undefined) || !role)
        return { role: "", users: [] };

    return { role, users: users as string[] };
}



defineCommand({
    name: "role-add",
    aliases: ["+", "ra"],
    description: "Add a role to one or more users",
    usage: "<role> <user> [user...]",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, react, reply }, ...args) {
        const { role, users } = parseArgs(msg, args);
        if (!role) return react(Emoji.QuestionMark);
        if (!hasHigherRoleThan(role, msg.member)) return react(Emoji.Anger);

        const failed = [] as string[];
        for (const u of users) {
            await msg.guild.addMemberRole(u, role, `Added by ${msg.author.tag}`)
                .catch(e => failed.push(String(e)));
        }

        if (!failed.length) return void react(Emoji.CheckMark);

        return reply("Failed to give some users that role:\n" + toCodeblock(failed.join("\n")));
    },
});

defineCommand({
    name: "role-remove",
    aliases: ["-", "rr"],
    description: "Remove a role from one or more users",
    usage: "<role> <user> [user...]",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, reply, react }, ...args) {
        const { role, users } = parseArgs(msg, args);
        if (!role) return react(Emoji.QuestionMark);
        if (!hasHigherRoleThan(role, msg.member)) return react(Emoji.Anger);

        const failed = [] as string[];
        for (const u of users) {
            await msg.guild.removeMemberRole(u, role, `Removed by ${msg.author.tag}`)
                .catch(() => failed.push(u));
        }

        if (!failed.length) return void react(Emoji.CheckMark);

        return reply("Failed to remove that role from some users:\n" + toCodeblock(failed.join("\n")));
    },
});
