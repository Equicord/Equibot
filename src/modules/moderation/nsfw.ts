import { createCanvas } from "@napi-rs/canvas";
import { decompressFrames, parseGIF } from "gifuct-js";
import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Emoji } from "~/constants";
import { fetchBuffer } from "~/util/fetch";
import { silently } from "~/util/functions";
import { logAutoModAction } from "~/util/logAction";
import { detectNSFW } from "~/util/nsfw";
import { formatDuration, until } from "~/util/time";

function extractFrames(gifBuffer: Buffer): Buffer[] {
    const gif = parseGIF(gifBuffer.buffer);
    const frames = decompressFrames(gif, true);

    if (frames.length === 0) return [];

    const { dims: { width, height } } = frames[0];

    const tempCanvas = createCanvas(width, height);
    const canvas = createCanvas(width, height);
    const tempCtx = tempCanvas.getContext("2d");
    const ctx = canvas.getContext("2d");

    const firstIdx = 0;
    const midIdx = Math.floor(frames.length / 2);
    const lastIdx = frames.length - 1;
    const targetIndices = new Set([firstIdx, midIdx, lastIdx]);

    const extracted: Buffer[] = [];
    let imageData: import("@napi-rs/canvas").ImageData | null = null;

    for (let i = 0; i <= lastIdx; i++) {
        const frame = frames[i];

        if (!imageData || imageData.width !== frame.dims.width || imageData.height !== frame.dims.height) {
            canvas.width = frame.dims.width;
            canvas.height = frame.dims.height;
            imageData = tempCtx.createImageData(frame.dims.width, frame.dims.height);
        }

        imageData!.data.set(frame.patch);
        tempCtx.putImageData(imageData!, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);

        if (frame.disposalType === 2) {
            ctx.clearRect(0, 0, frame.dims.width, frame.dims.height);
        }

        if (targetIndices.has(i)) {
            extracted.push(Buffer.from(canvas.toBuffer("image/png")));
        }
    }

    return extracted;
}

export async function moderateNSFW(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (!msg.member || msg.member.roles.includes(Config.roles.regular)) return false;

    const attachments = msg.attachments.filter(att => att.contentType?.startsWith("image/"));
    if (attachments.length === 0) return false;

    let flaggedAttachment: Buffer | null = null;
    for (const att of attachments) {
        try {
            const buf = await fetchBuffer(att.url);

            if (att.contentType === "image/gif" && Config.moderation.nsfwScanGifs) {
                const frames = extractFrames(buf);
                for (const frameBuf of frames) {
                    const results = await detectNSFW(frameBuf);
                    const nsfwResult = results.find(r => r.label === "nsfw");
                    if (nsfwResult && nsfwResult.score > Config.moderation.nsfwConfidenceThreshold) {
                        flaggedAttachment = frameBuf;
                        break;
                    }
                }
            } else {
                const results = await detectNSFW(buf);
                const nsfwResult = results.find(r => r.label === "nsfw");
                if (nsfwResult && nsfwResult.score > Config.moderation.nsfwConfidenceThreshold) {
                    flaggedAttachment = buf;
                }
            }

            if (flaggedAttachment) break;
        } catch (e) {
            console.error(`Failed to process attachment for NSFW detection: ${att.url}`, e);
        }
    }

    if (!flaggedAttachment) return false;

    silently(msg.delete("NSFW image"));

    silently(msg.guild.editMember(msg.author.id, {
        communicationDisabledUntil: until(Config.moderation.nsfwTimeoutDuration),
        reason: "Posted NSFW image"
    }));

    logAutoModAction({
        content: `${Emoji.Boot} ${msg.member.mention} posted an NSFW image in ${msg.channel.mention} and has been timed out for ${formatDuration(Config.moderation.nsfwTimeoutDuration)}`,
        files: [{ contents: flaggedAttachment, name: "flagged.png" }],
        embeds: [{
            author: {
                name: msg.member.tag,
                iconURL: msg.member.avatarURL()
            },
            image: { url: "attachment://flagged.png" }
        }]
    });

    return true;
}
