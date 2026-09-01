import { mkdtemp, readFile, rm } from "fs/promises";
import { ButtonStyles, ComponentTypes, Message, MessageFlags } from "oceanic.js";
import { tmpdir } from "os";
import { join } from "path";

import { Vaius } from "~/Client";
import { BotState } from "~/db/botState";
import { execFileP } from "~/util/childProcess";
import { reply } from "~/util/discord";
import { downloadToFile } from "~/util/fetch";
import { buildContent } from "~/util/muteScreenrecordingsFormat";

async function muteVideo(file: string, outFile: string) {
    const res = await execFileP("ffmpeg", ["-i", file, "-c", "copy", "-an", outFile]);
    return res.stdout.trim();
}

function getVideoInfo(msg: Message) {
    const attachment = msg.attachments.first();
    if (attachment?.contentType?.includes("video")) {
        return {
            url: attachment.url,
            filename: attachment.filename
        };
    }

    const embed = msg.embeds.find(e => e.type === "video" && e.video?.url);
    if (embed?.video?.url) {
        const filename = new URL(embed.video.url).pathname.split("/").pop() || "video.mp4";
        return {
            url: embed.video.url,
            filename
        };
    }
}

Vaius.on("messageCreate", async msg => {
    if (!msg.inCachedGuildChannel()) return;

    if (!BotState.mutedUsers.includes(msg.author.id)) return;

    const video = getVideoInfo(msg);
    if (!video) return;

    const tempDir = await mkdtemp(join(tmpdir(), "vaius-mute-"));
    try {
        const file = join(tempDir, video.filename);
        const mutedFile = join(tempDir, "muted-" + video.filename);

        await downloadToFile(video.url, file);

        await muteVideo(file, mutedFile);

        await reply(msg, {
            content: buildContent(msg.author.id, msg.content),
            flags: MessageFlags.SUPPRESS_EMBEDS,
            files: [{
                contents: await readFile(mutedFile),
                name: video.filename
            }],
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: [
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `mute-screenrecordings-edit:${msg.author.id}`,
                        style: ButtonStyles.SECONDARY,
                        label: "Edit"
                    },
                    {
                        type: ComponentTypes.BUTTON,
                        customID: `mute-screenrecordings-delete:${msg.author.id}`,
                        style: ButtonStyles.DANGER,
                        label: "Delete"
                    }
                ]
            }]
        });
        await msg.delete();
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});
