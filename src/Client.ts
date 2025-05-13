import { AnyTextableChannel, Client, Message } from "oceanic.js";

import { CommandContext, Commands } from "./Commands";
import { Emoji, SUPPORT_ALLOWED_CHANNELS } from "./constants";
import { DISCORD_TOKEN, MOD_PERMS_ROLE_ID, PREFIXES } from "./env";
import { moderateMessage } from "./modules/moderate";
import { reply } from "./util/discord";
import { silently } from "./util/functions";

export const Vaius = new Client({
    auth: "Bot " + DISCORD_TOKEN,
    gateway: { intents: ["ALL"] },
    allowedMentions: {
        everyone: false,
        repliedUser: false,
        roles: false,
        users: false
    }
});

export let OwnerId: string;
Vaius.once("ready", async () => {
    Vaius.rest.oauth.getApplication().then(app => {
        OwnerId = app.ownerID;
    });

    console.log("hi");
    console.log(`Connected as ${Vaius.user.tag} (${Vaius.user.id})`);
    console.log(`I am in ${Vaius.guilds.size} guilds`);
    console.log(`https://discord.com/oauth2/authorize?client_id=${Vaius.user.id}&permissions=8&scope=bot+applications.commands`);
});

const whitespaceRe = /\s+/;

Vaius.on("messageCreate", msg => handleMessage(msg, false));
Vaius.on("messageUpdate", (msg, oldMsg) => {
    if (oldMsg && msg.content === oldMsg.content) return;

    handleMessage(msg, true);
});

async function handleMessage(msg: Message, isEdit: boolean) {
    if (msg.author.bot) return;
    moderateMessage(msg, isEdit);

    const lowerContent = msg.content.toLowerCase();

    const prefix = PREFIXES.find(p => lowerContent.startsWith(p));
    if (!prefix) return;

    const content = msg.content.slice(prefix.length).trim();
    const args = content.split(whitespaceRe);

    const cmdName = args.shift()?.toLowerCase()!;
    const cmd = Commands[cmdName];
    if (!cmd) return;

    if (cmd.ownerOnly && msg.author.id !== OwnerId)
        return;

    if (cmd.guildOnly && msg.inDirectMessageChannel())
        return reply(msg, { content: "This command can only be used in servers" });

    if (cmd.permissions) {
        if (!msg.inCachedGuildChannel()) return;

        const memberPerms = msg.channel.permissionsOf(msg.member);
        if (cmd.permissions.some(perm => !memberPerms.has(perm)))
            return;
    }

    if (cmd.modOnly) {
        if (!msg.inCachedGuildChannel()) return;

        if (!msg.member.roles.includes(MOD_PERMS_ROLE_ID))
            return silently(msg.createReaction(Emoji.Anger));
    }

    const noRateLimit = SUPPORT_ALLOWED_CHANNELS.includes(msg.channel?.id!) || msg.member?.permissions.has("MANAGE_MESSAGES");

    if (!noRateLimit && cmd.rateLimits.getOrAdd(msg.author.id)) {
        silently(msg.createReaction("🛑"));
        silently(msg.createReaction("🐌"));
        return;
    }

    if (!msg.channel)
        await msg.client.rest.channels.get(msg.channelID);

    const context = new CommandContext(
        msg as Message<AnyTextableChannel>,
        prefix,
        cmdName
    );

    try {
        if (cmd.rawContent)
            await cmd.execute(context, content.slice(cmdName.length).trim());
        else
            await cmd.execute(context, ...args);
    } catch (e) {
        console.error(
            `Failed to run ${cmd.name}`,
            `\n> ${msg.content}\n`,
            e
        );
        silently(reply(msg, { content: "oop, that didn't go well 💥" }));
    }
}
