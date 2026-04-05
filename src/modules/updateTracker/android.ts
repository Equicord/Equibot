import { join } from "path";
import { Vaius } from "~/Client";
import Config from "~/config";
import { DATA_DIR } from "~/constants";
import { toTitle } from "~/util/text";
import { readVersion, writeVersion } from "./utils";

const DISCORD_PKG = "com.discord";
const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${DISCORD_PKG}`;
const TRACKER_BASE = "https://tracker.vendetta.rocks/tracker/download";
const TRACKER_INDEX = "https://tracker.vendetta.rocks/tracker/index";

type ReleaseType = "stable" | "beta" | "alpha";

interface TrackerIndex {
    latest: Record<ReleaseType, number>;
}

function trackerUrl(buildID: number, split: string): string {
    return `${TRACKER_BASE}/${buildID}/${split}`;
}

async function fetchLatestVersions(): Promise<TrackerIndex["latest"]> {
    const resp = await fetch(TRACKER_INDEX);
    if (!resp.ok) throw new Error(`Vendetta tracker fetch failed: ${resp.statusText}`);
    const json: TrackerIndex = await resp.json();
    return json.latest;
}

function versionCodeToName(versionCode: number): string {
    const str = versionCode.toString();
    const major = str.slice(0, 3);
    const minor = parseInt(str.slice(4)).toString();
    return `${major}.${minor}`;
}

export async function checkAndroid(bypass = false, extraChannelId?: string): Promise<void> {
    let latest: TrackerIndex["latest"];

    try {
        latest = await fetchLatestVersions();
    } catch (err) {
        console.error("[UpdateTracker Android] Failed to fetch version:", err);
        return;
    }

    const channelIds = [Config.updateTracker.logChannelId];
    if (extraChannelId && extraChannelId !== Config.updateTracker.logChannelId) {
        channelIds.push(extraChannelId);
    }

    for (const releaseType of ["stable", "beta", "alpha"] as ReleaseType[]) {
        const versionCode = latest[releaseType];
        const versionFile = join(DATA_DIR, `./discord_version.android.${releaseType}.txt`);
        const knownVersion = readVersion(versionFile);
        const versionName = versionCodeToName(versionCode);

        if (!bypass && knownVersion >= versionCode) continue;

        const embed = {
            author: {
                name: "Discord - Talk, Play, Hang Out",
                url: GOOGLE_PLAY_URL,
                iconURL: "https://icons.duckduckgo.com/ip3/discord.com.ico",
            },
            title: `New Android ${toTitle(releaseType)} Release: ${versionName} (${versionCode})`,
            description: `Build \`${versionCode}\` is now available.\nDetected at ${new Date().toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "long",
                timeStyle: "short",
            })}`,
            fields: [
                {
                    name: "Google Play Store",
                    value: GOOGLE_PLAY_URL,
                    inline: true,
                },
                {
                    name: "Vendetta Tracker",
                    value: [
                        `[base.apk](${trackerUrl(versionCode, "base")})`,
                        `[config.arm64_v8a.apk](${trackerUrl(versionCode, "config.arm64_v8a")})`,
                        `[config.armeabi_v7a.apk](${trackerUrl(versionCode, "config.armeabi_v7a")})`,
                        `[config.x86_64.apk](${trackerUrl(versionCode, "config.x86_64")})`,
                        `[config.x86.apk](${trackerUrl(versionCode, "config.x86")})`,
                        `[config.hdpi.apk](${trackerUrl(versionCode, "config.hdpi")})`,
                        `[config.xxhdpi.apk](${trackerUrl(versionCode, "config.xxhdpi")})`,
                        `[config.de.apk](${trackerUrl(versionCode, "config.de")})`,
                        `[config.en.apk](${trackerUrl(versionCode, "config.en")})`,
                    ].join("\n"),
                    inline: true,
                },
            ],
            color: releaseType === "alpha" ? 0xFEF40C : releaseType === "beta" ? 0xEE850B : 0x675AF5,
        };

        for (const channelId of channelIds) {
            try {
                await Vaius.rest.channels.createMessage(channelId, { embeds: [embed] });
            } catch (err) {
                console.error(`[UpdateTracker Android] Failed to post ${releaseType} to ${channelId}:`, err);
            }
        }

        writeVersion(versionFile, versionCode);
    }
}
