import { mkdirSync } from "fs";
import { join } from "path";

import { BOT_CHANNEL_ID, DEV_CHANNEL_ID, NODE_ENV, SUPPORT_CHANNEL_ID } from "~/env";
import { makeConstants } from "~/util/objects";

export const ASSET_DIR = join(__dirname, "..", "assets");
export const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

export const PROD = NODE_ENV === "production";

export const SUPPORT_ALLOWED_CHANNELS = [
    SUPPORT_CHANNEL_ID,
    BOT_CHANNEL_ID,
    DEV_CHANNEL_ID,
];

export const DONOR_ROLE_ID = "1173316879083896912";

export const enum Seconds {
    SECOND = 1,
    MINUTE = 60,
    HOUR = 60 * 60,
    DAY = 24 * 60 * 60,
    WEEK = 7 * 24 * 60 * 60
}

export const enum Millis {
    SECOND = 1000,
    MINUTE = 60 * 1000,
    HOUR = 60 * 60 * 1000,
    DAY = 24 * 60 * 60 * 1000,
    WEEK = 7 * 24 * 60 * 60 * 1000
}

export const Emoji = makeConstants({
    X: "❌",
    CheckMark: "✅",
    QuestionMark: "❓",
    Anger: "💢",
    TrashCan: "🗑️",
    Hammer: "🔨",

    GreenDot: "🟢",
    RedDot: "🔴",

    DoubleLeft: "⏪",
    Left: "◀️",
    InputNumbers: "🔢",
    Right: "▶️",
    DoubleRight: "⏩",

    Claim: "🛄",

    SeeNoEvil: "🙈",
    Owl: "🦉",

    Die: "🎲",
    Coin: "🪙",
});

export const ZWSP = "\u200B";
