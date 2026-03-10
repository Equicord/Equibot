import { join } from "path";
import { Vaius } from "~/Client";
import Config from "~/config";
import { DATA_DIR } from "~/constants";
import { readVersion, writeVersion } from "./utils";

const APKMIRROR_USER_AGENT = "APKUpdater-v2.0.5";
const APKMIRROR_AUTH = "Basic YXBpLWFwa3VwZGF0ZXI6cm01cmNmcnVVakt5MDRzTXB5TVBKWFc4";
const DISCORD_PKG = "com.discord";
const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${DISCORD_PKG}`;
const TRACKER_BASE = "https://tracker.vendetta.rocks/tracker/download";

type ReleaseType = "stable" | "beta" | "alpha";

function parseApkLink(link: string): { versionName: string; releaseType: ReleaseType; } | null {
    const match = link.match(/-([\d]+-[\d]+)-(stable|beta|alpha)-release/);
    if (!match) return null;
    return {
        versionName: match[1].replace("-", "."),
        releaseType: match[2] as ReleaseType,
    };
}

async function fetchLatestVersion(): Promise<{ versionCode: number; versionName: string; link: string; releaseType: ReleaseType; } | null> {
    const resp = await fetch("https://www.apkmirror.com/wp-json/apkm/v1/app_exists/", {
        method: "POST",
        headers: {
            "User-Agent": APKMIRROR_USER_AGENT,
            "Authorization": APKMIRROR_AUTH,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ pnames: [DISCORD_PKG] }),
    });

    if (!resp.ok) throw new Error(`APKMirror version check failed: ${resp.statusText}`);

    const json = await resp.json();
    const apk = json.data[0].apks[0];
    const parsed = parseApkLink(apk.link);
    if (!parsed) return null;

    return {
        versionCode: Number(apk.version_code),
        versionName: parsed.versionName,
        link: apk.link,
        releaseType: parsed.releaseType,
    };
}

function trackerUrl(buildID: number, split: string): string {
    return `${TRACKER_BASE}/${buildID}/${split}`;
}

export async function checkAndroid(bypass = false): Promise<void> {
    let version: Awaited<ReturnType<typeof fetchLatestVersion>>;

    try {
        version = await fetchLatestVersion();
    } catch (err) {
        console.error("[updateTracker] Failed to fetch version:", err);
        return;
    }

    if (!version) return;

    const { versionCode, versionName, link, releaseType } = version;
    const versionFile = join(DATA_DIR, `./discord_version.android.${releaseType}.txt`);
    const knownVersion = readVersion(versionFile);

    if (!bypass && knownVersion >= versionCode) return;

    try {
        await Vaius.rest.channels.createMessage(Config.updateTracker.logChannelId, {
            embeds: [{
                author: {
                    name: "Discord - Talk, Play, Hang Out",
                    url: GOOGLE_PLAY_URL,
                    iconURL: "https://icons.duckduckgo.com/ip3/discord.com.ico"
                },
                title: `New ${releaseType} Version: **${versionName} (${versionCode})**`,
                description: `[View on APKMirror](https://www.apkmirror.com${link})`,
                fields: [
                    {
                        name: "Base",
                        value: `[base](${trackerUrl(versionCode, "base")})`,
                        inline: true
                    },
                    {
                        name: "Architecture",
                        value: [
                            `[arm64-v8a](${trackerUrl(versionCode, "config.arm64_v8a")})`,
                            `[armeabi-v7a](${trackerUrl(versionCode, "config.armeabi_v7a")})`,
                            `[x86_64](${trackerUrl(versionCode, "config.x86_64")})`,
                            `[x86](${trackerUrl(versionCode, "config.x86")})`,
                        ].join("\n"),
                        inline: true
                    },
                    {
                        name: "DPI",
                        value: [
                            `[hdpi](${trackerUrl(versionCode, "config.hdpi")})`,
                            `[xxhdpi](${trackerUrl(versionCode, "config.xxhdpi")})`,
                        ].join("\n"),
                        inline: true
                    },
                    {
                        name: "Language",
                        value: [
                            `[de](${trackerUrl(versionCode, "config.de")})`,
                            `[en](${trackerUrl(versionCode, "config.en")})`,
                        ].join("\n"),
                        inline: true
                    },
                ],
            }],
        });
    } catch (err) {
        console.error(`[updateTracker] Failed to post ${releaseType}:`, err);
    }

    writeVersion(versionFile, versionCode);
}
