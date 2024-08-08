import { SqliteError } from "better-sqlite3";
import { createHash } from "crypto";

import { Emoji } from "~/constants";
import { db } from "~/db";
import { ROBOT_9000_CHANNEL_ID } from "~/env";

import { Vaius } from "../Client";

function normalizeText(text: string) {
    return text
        .replace(/[!'".,\-?]/g, "")
        .replace(/<:(\w+):\d+>/g, ":$1:")
        .replace(/[\s\xA0\u180E\u2000-\u200D\u2060\u202F\u205F\u2800\u3000\u3164\uFEFF]+/g, " ")
        .toLowerCase();
}

async function tryInsertHash(hash: string): Promise<boolean> {
    try {
        await db.insertInto("signalHashes")
            .values({ hash })
            .execute();
        return true;
    } catch (error) {
        if (error instanceof SqliteError && error.code === "SQLITE_CONSTRAINT_PRIMARYKEY") return false;
        throw error;
    }
}

Vaius.on("messageCreate", async msg => {
    if (msg.channelID !== ROBOT_9000_CHANNEL_ID) return;
    if (msg.author.bot) return;

    const { content, attachments } = msg;
    const normalizedContent = normalizeText(content);
    const attachmentMeta = JSON.stringify(attachments.map(attachment => ({
        filename: attachment.filename,
        size: attachment.size,
        width: attachment.width,
        height: attachment.height,
    })));
    const hash = createHash("sha1").update(normalizedContent + attachmentMeta).digest("hex");

    try {
        const inserted = await tryInsertHash(hash);
        if (inserted) return;
    } catch (error) {
        await msg.createReaction(Emoji.Sos);
        throw error;
    }

    // On duplicate message
    await msg.delete();
});
