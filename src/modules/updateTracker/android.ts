import { join } from "path";
import { Vaius } from "~/Client";
import Config from "~/config";
import { DATA_DIR } from "~/constants";
import { toTitle } from "~/util/text";
import { readVersion, writeVersion } from "./utils";

const APKMIRROR_USER_AGENT = "APKUpdater-v2.0.5";
const APKMIRROR_AUTH = "Basic YXBpLWFwa3VwZGF0ZXI6cm01cmNmcnVVakt5MDRzTXB5TVBKWFc4";
const DISCORD_PKG = "com.discord";
const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${DISCORD_PKG}`;
const TRACKER_BASE = "https://tracker.vendetta.rocks/tracker/download";

type ReleaseType = "stable" | "beta" | "alpha";

interface VersionInfo {
    versionCode: number;
    versionName: string;
    link: string;
    releaseType: ReleaseType;
    whatsNew: string;
    publishDate: string;
}

function parseApkLink(link: string): { versionName: string; releaseType: ReleaseType; } | null {
    const match = link.match(/-([\d]+-[\d]+)-(stable|beta|alpha)-release/);
    if (!match) return null;
    return {
        versionName: match[1].replace("-", "."),
        releaseType: match[2] as ReleaseType,
    };
}

async function fetchLatestVersion(): Promise<VersionInfo | null> {
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
    const data = json.data[0];
    const apk = data.apks[0];
    const parsed = parseApkLink(apk.link);
    if (!parsed) return null;

    return {
        versionCode: Number(apk.version_code),
        versionName: parsed.versionName,
        link: apk.link,
        releaseType: parsed.releaseType,
        whatsNew: data.release.whats_new?.replace(/<[^>]+>/g, "").trim() ?? "",
        publishDate: data.release.publish_date,
    };
}

function trackerUrl(buildID: number, split: string): string {
    return `${TRACKER_BASE}/${buildID}/${split}`;
}

export async function checkAndroid(bypass = false, extraChannelId?: string): Promise<void> {
    let version: Awaited<ReturnType<typeof fetchLatestVersion>>;

    try {
        version = await fetchLatestVersion();
    } catch (err) {
        console.error("[UpdateTracker Android] Failed to fetch version:", err);
        return;
    }

    if (!version) return;

    const { versionCode, versionName, link, releaseType, whatsNew, publishDate } = version;
    const versionFile = join(DATA_DIR, `./discord_version.android.${releaseType}.txt`);
    const knownVersion = readVersion(versionFile);

    if (!bypass && knownVersion >= versionCode) return;

    const releaseDate = new Date(publishDate).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "long",
        timeStyle: "short",
    });

    const channelIds = [Config.updateTracker.logChannelId];
    if (extraChannelId && extraChannelId !== Config.updateTracker.logChannelId) {
        channelIds.push(extraChannelId);
    }

    const embed = {
        author: {
            name: "Discord - Talk, Play, Hang Out",
            url: GOOGLE_PLAY_URL,
            iconURL: "https://icons.duckduckgo.com/ip3/discord.com.ico",
        },
        title: `New Android ${toTitle(releaseType)} Release: **${versionName} (${versionCode})**`,
        description: `Released ${releaseDate}\n${whatsNew}`,
        fields: [
            {
                name: "Google Play Store",
                value: GOOGLE_PLAY_URL,
                inline: true,
            },
            {
                name: "APKMirror",
                value: `https://www.apkmirror.com${link}`,
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
        color: releaseType === "alpha" ? 0xFEF40C : releaseType === "beta" ? 0xEE850B : 0x675AF5
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
