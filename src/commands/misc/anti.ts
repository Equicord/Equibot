import { createCanvas } from "@napi-rs/canvas";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { User } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { registerChatInputCommand } from "~/SlashCommands";
import { resolveUser } from "~/util/resolvers";
import { CommandIntegerOption, CommandUserOption } from "~components";
import { makeGifProvider } from "./gif";

async function generateAnti(user: User, strokeWidth: number) {
    const isGif = user.avatar?.startsWith("a_") ?? false;
    const buf = await fetch(user.avatarURL(isGif ? "gif" : "png", 256)).then(res => res.arrayBuffer());
    const avatarProvider = await makeGifProvider(buf, isGif);

    const width = 256, height = 256;

    const gif = GIFEncoder();
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    let palette: number[][] | null = null;

    function processFrame(avatarIdx: number) {
        const { frame, delay } = avatarProvider.getFrame(avatarIdx);

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(frame, 0, 0, width, height);
        ctx.strokeStyle = "red";
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
        ctx.stroke();

        const { data } = ctx.getImageData(0, 0, width, height);

        palette ??= quantize(data, 256, {
            format: "rgba4444",
            oneBitAlpha: true,
        });

        const index = applyPalette(data, palette, "rgba4444");

        // Find which palette entry represents "transparent" (alpha === 0)
        const transparentIndex = palette.findIndex(([, , , a]) => a === 0);

        gif.writeFrame(index, width, height, {
            palette,
            delay,
            transparent: transparentIndex !== -1,
            transparentIndex: transparentIndex !== -1 ? transparentIndex : undefined,
        });
    }

    for (let i = 0; i < avatarProvider.frames; i++) {
        processFrame(i);
    }

    gif.finish();

    return { name: `anti-${user.username}.gif`, contents: gif.bytesView() as Buffer };
}

defineCommand({
    name: "anti",
    description: "Overlay ❌ over someone's avatar",
    usage: "<@user> [strokeWidth = 30]",
    async execute({ reply }, mention?: string, strokeWidthS?: string) {
        const user = await resolveUser(mention);
        if (!user) return reply("Unknown user");

        const strokeWidth = Number(strokeWidthS ?? "30");
        if (isNaN(strokeWidth) || strokeWidth < 0 || strokeWidth > 100) {
            return reply("Invalid stroke width (must be a number between 0 and 100)");
        }

        return reply({ files: [await generateAnti(user, strokeWidth)] });
    },
});

registerChatInputCommand(
    {
        name: "anti",
        description: "Overlay ❌ over someone's avatar",
        options: [
            CommandUserOption({ name: "user", description: "The user to anti", required: true }),
            CommandIntegerOption({ name: "stroke-width", description: "Width of the cross (default: 30)", minValue: 0, maxValue: 100 })
        ]
    },
    {
        async handle(interaction) {
            const user = interaction.data.options.getUser("user", true);
            const strokeWidth = interaction.data.options.getInteger("stroke-width") ?? 30;

            await interaction.defer();
            await interaction.createFollowup({ files: [await generateAnti(user, strokeWidth)] });
        }
    }
);
