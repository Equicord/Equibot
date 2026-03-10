import { Vaius } from "~/Client";
import Config from "~/config";
import { readVersion, writeVersion } from "./utils";

const APKMIRROR_USER_AGENT = "APKUpdater-v2.0.5";
const APKMIRROR_AUTH = "Basic YXBpLWFwa3VwZGF0ZXI6cm01cmNmcnVVakt5MDRzTXB5TVBKWFc4";
const DISCORD_PKG = "com.discord";
const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${DISCORD_PKG}`;

function extractReleaseType(link: string): string {
    const match = link.match(/-(stable|beta|alpha)-release/);
    return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : "Unknown";
}

async function fetchLatestVersion(): Promise<{ versionCode: number; versionName: string; link: string; releaseType: string; }> {
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

    return {
        versionCode: parseInt(apk.version_code, 10),
        versionName: apk.version,
        link: apk.link,
        releaseType: extractReleaseType(apk.link),
    };
}

export async function checkAndroid(): Promise<void> {
    const versionFile = "./discord_version.android.txt";
    const knownVersion = readVersion(versionFile);

    let versionCode: number;
    let versionName: string;
    let link: string;
    let releaseType: string;

    try {
        ({ versionCode, versionName, link, releaseType } = await fetchLatestVersion());
    } catch (err) {
        console.error("[updateTracker] Failed to fetch version:", err);
        return;
    }

    if (knownVersion === 0) {
        writeVersion(versionFile, versionCode);
        return;
    }

    if (knownVersion < versionCode) {
        try {
            await Vaius.rest.channels.createMessage(Config.updateTracker.logChannelId, {
                embeds: [{
                    author: {
                        name: "Discord",
                        url: GOOGLE_PLAY_URL,
                    },
                    title: `New ${releaseType}: **${versionName} (${versionCode})**`,
                    description: `[View on APKMirror](https://www.apkmirror.com${link})`,
                }],
            });
        } catch (err) {
            console.error("[updateTracker]", err);
        }

        writeVersion(versionFile, versionCode);
    }
}
