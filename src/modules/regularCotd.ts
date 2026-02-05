import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "fs/promises";
import { join } from "path";
import Config from "~/config";

import { ASSET_DIR } from "~/constants";
import { daily } from "~/util/daily";
import { getHomeGuild } from "~/util/discord";
import { fetchJson } from "~/util/fetch";
import { randomHexColor } from "~/util/random";

interface ColorResponse {
    name: {
        value: string;
        closest_named_hex: string;
    };
}

function shadeFrom(hex, lightnessShift) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    l = Math.max(0, Math.min(1, l + lightnessShift));

    function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    let r2, g2, b2;
    if (s === 0) {
        r2 = g2 = b2 = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r2 = hue2rgb(p, q, h + 1 / 3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = x => Math.round(x * 255).toString(16).padStart(2, "0");
    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

function isDark(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
}

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

export async function drawRoleIcon(color: string, size = 512) {
    color = String(color)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");

    const base = join(ASSET_DIR, "image-gen/regular-icon");
    const svgPath = join(base, "icon.svg");

    const svgData = await readFile(svgPath, "utf-8");
    const tintedSvg = svgData
        .replaceAll("#5a5a5a", isDark(color) ? shadeFrom(color, -0.1) : color)
        .replaceAll("#828282", isDark(color) ? color : shadeFrom(color, 0.1));

    const svg = await loadImage(Buffer.from(tintedSvg));

    svg.width = size;
    svg.height = size;

    const canvas = createCanvas(size, size);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(svg, 0, 0, size, size);

    return canvas.toBuffer("image/png");
}


export async function rerollCotd(inputHex?: string) {
    const hexColor = inputHex ?? randomHexColor();
    const {
        name: {
            value: name,
            closest_named_hex: hex
        }
    } = await fetchJson<ColorResponse>("https://www.thecolorapi.com/id?hex=" + hexColor.slice(1));

    const color = parseInt(hex.slice(1), 16);
    const icon = await drawRoleIcon(hex);

    await getHomeGuild()!.editRole(Config.roles.regular, {
        name: `regular (${name.toLowerCase()})`,
        colors: {
            primaryColor: color,
        },
        icon,
        reason: "Rerolled cozy of the day"
    });

    return hexColor;
}

daily(rerollCotd);
