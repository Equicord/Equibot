import { mkdirSync } from "fs";
import { join } from "path";
import { UserFlags } from "oceanic.js";
import { makeConstants } from "~/util/objects";
import Config from "./config";

export const EQUICORD_SITE = "https://equicord.org";

export const ASSET_DIR = join(__dirname, "..", "assets");
export const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

export const PROD = Config.mode === "production";

export const SUPPORT_ALLOWED_CHANNELS = [
    Config.channels.support,
    ...Config.channels.supportAllowedChannels,
];

export const MANAGEABLE_ROLES = [
    Config.roles.donor,
    Config.roles.regular,
    Config.roles.contributor,
    Config.roles.vencordContrib,
    Config.roles.bugHunter,
    Config.roles.vip,
    Config.roles.fileWhitelist,
    ...Config.roles.manageableRoles,
];

export const enum Seconds {
    SECOND = 1,
    MINUTE = 60,
    HOUR = 60 * 60,
    DAY = 24 * 60 * 60,
    WEEK = 7 * 24 * 60 * 60,
}

export const enum Millis {
    SECOND = 1000,
    MINUTE = 60 * 1000,
    HOUR = 60 * 60 * 1000,
    DAY = 24 * 60 * 60 * 1000,
    WEEK = 7 * 24 * 60 * 60 * 1000,
}

export const enum Bytes {
    KB = 1024,
    MB = 1024 * 1024,
}

export const Emoji = makeConstants({
    X: "❌",
    CheckMark: "✅",
    QuestionMark: "❓",
    Anger: "💢",
    TrashCan: "🗑️",
    Hammer: "🔨",
    Boot: "👢",

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
    Earth: "🌍",
});

export const ZWSP = "\u200B";

export const UserFlagNames: Record<number, string> = {
    [UserFlags.STAFF]: "Discord Staff",
    [UserFlags.PARTNER]: "Discord Partner",
    [UserFlags.HYPESQUAD]: "HypeSquad Events",
    [UserFlags.BUG_HUNTER_LEVEL_1]: "Bug Hunter Level 1",
    [UserFlags.HYPESQUAD_BRAVERY]: "HypeSquad Bravery",
    [UserFlags.HYPESQUAD_BRILLIANCE]: "HypeSquad Brilliance",
    [UserFlags.HYPESQUAD_BALANCE]: "HypeSquad Balance",
    [UserFlags.EARLY_SUPPORTER]: "Early Supporter",
    [UserFlags.PSEUDO_TEAM_USER]: "Team User",
    [UserFlags.SYSTEM]: "System",
    [UserFlags.BUG_HUNTER_LEVEL_2]: "Bug Hunter Level 2",
    [UserFlags.VERIFIED_BOT]: "Verified Bot",
    [UserFlags.VERIFIED_DEVELOPER]: "Verified Developer",
    [UserFlags.CERTIFIED_MODERATOR]: "Certified Moderator",
    [UserFlags.BOT_HTTP_INTERACTIONS]: "Bot HTTP Interactions",
    [UserFlags.ACTIVE_DEVELOPER]: "Active Developer",
};
