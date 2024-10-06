import { SqliteError } from "better-sqlite3";
import { createHash } from "crypto";
import { NotNull } from "kysely";
import { Message } from "oceanic.js";

import { Vaius } from "~/Client";
import { R9K_MUTE_BASE } from "~/constants";
import { db } from "~/db";
import { GUILD_ID, MOD_ROLE_ID, R9K_CHANNEL_ID, R9K_MUTE_ROLE_ID } from "~/env";
import { reply, silently } from "~/util";

function formatTimeout(seconds: number) {
    const s = seconds % 60;
    const m = Math.floor(seconds / 60 % 60);
    const h = Math.floor(seconds / 60 / 60 % 24);
    const d = Math.floor(seconds / 60 / 60 / 24);

    let text = "";

    if (d) text += `${d} day` + ((d === 1) ? " " : "s ");
    if (h) text += `${h} hour` + ((h === 1) ? " " : "s ");
    if (m) text += `${m} minute` + ((m === 1) ? " " : "s ");
    if (s) text += `${s} second` + ((s === 1) ? " " : "s ");

    return text.trim();
}

function normalizeText(text: string) {
    return text
        .toLowerCase()
        .replace(/<:\w+:(\d)+>/g, ":$1:") // normalise emoji to id
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // control characters
        .replace(/[\s\xA0\u180E\u2000-\u200D\u2060\u202F\u205F\u2800\u3000\u3164\uFEFF]+/g, " ") // normalise spaces
        .replace(/(.)'(.)/g, "$1$2") // remove apostrophes if used for contraction
        .replace(/[^\w -:<>@]+/g, " ") // other punctuation
        .replace(/(?<!\w)-+|-+(?!\w)/g, "") // remove lone dashes
        .replace(/(.)\1{2,}/g, "$1$1") // repeating characters (normalise to only 2 of that char)
        .trim();
}

async function checkSignal(message: Message): Promise<boolean> {
    const attachmentData = JSON.stringify(message.attachments.map(attachment => ({
        filename: attachment.filename,
        size: attachment.size,
        width: attachment.width,
        height: attachment.height,
    })));

    const stickerData = JSON.stringify(message.stickerItems?.map(stickerItem => stickerItem.id));

    const hash = createHash("sha1")
        .update(normalizeText(message.content))
        .update(attachmentData)
        .update(stickerData)
        .digest("hex");

    try {
        await db.insertInto("r9kSignals").values({ signal: hash }).execute();
        return false;
    } catch (e) {
        if (e instanceof SqliteError && e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") return true;
        throw e;
    }
}

async function getMutePower(user: string) {
    const userInfo = await db
        .insertInto("r9kPunishments")
        .values({
            id: user,
            power: 1
        })
        .onConflict(oc => oc
            .column("id")
            .doUpdateSet(eb => ({ power: eb("power", "+", 1) }))
        )
        .returning("power")
        .executeTakeFirst();

    return userInfo!.power;
}

async function unmute(id: string) {
    await db.updateTable("r9kPunishments")
        .where("id", "=", id)
        .set("punishmentRevocationTime", null)
        .execute();
    await Vaius.guilds.get(GUILD_ID)!.removeMemberRole(id, R9K_MUTE_ROLE_ID, "R9K punishment finished");
}

Vaius.on("messageCreate", async msg => {
    if (msg.channelID !== R9K_CHANNEL_ID) return;
    if (msg.author.bot) return;
    if (msg.member!.roles.includes(MOD_ROLE_ID)) return; // moderators are exempt from R9K for.. well.. moderation purposes

    if (!await checkSignal(msg)) return;

    const power = await getMutePower(msg.author.id);

    const muteTime = R9K_MUTE_BASE ** power;
    const unmuteTimestamp = Date.now() + (muteTime * 1000);

    await db.updateTable("r9kPunishments")
        .where("id", "=", msg.author.id)
        .set("punishmentRevocationTime", unmuteTimestamp)
        .execute();

    await msg.member!.addRole(R9K_MUTE_ROLE_ID, "R9K violation");
    setTimeout(() => {
        unmute(msg.member!.id);
    }, muteTime * 1000);

    silently(reply(msg, `You have been muted for ${formatTimeout(muteTime)}.`));
});

Vaius.on("ready", async () => {
    const punishments = await db
        .selectFrom("r9kPunishments")
        .select(["id", "punishmentRevocationTime"])
        .where("punishmentRevocationTime", "is not", null)
        .$narrowType<{ punishmentRevocationTime: NotNull }>()
        .execute();

    for (const punishment of punishments) {
        if (punishment.punishmentRevocationTime <= Date.now()) {
            await unmute(punishment.id);
        } else {
            setTimeout(() => {
                unmute(punishment.id);
            }, Date.now() - punishment.punishmentRevocationTime);
        }
    }
});
