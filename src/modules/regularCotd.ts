import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "fs/promises";
import { join } from "path";

import { ASSET_DIR } from "~/constants";

export async function drawBlobCatCozy(color: string, size = 512) {
    color = String(color)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");

    const base = join(ASSET_DIR, "image-gen/regular-icon");
    const svgPath = join(base, "bcc.svg");

    const svgData = await readFile(svgPath, "utf-8");
    const tintedSvg = svgData.replaceAll("#1a2b3c", color);
    const svg = await loadImage(Buffer.from(tintedSvg));

    svg.width = size;
    svg.height = size;

    const canvas = createCanvas(size, size);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(svg, 0, 0, size, size);

    return canvas.toBuffer("image/png");
}
