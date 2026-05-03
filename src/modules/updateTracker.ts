import fs from "fs";
import { join } from "path";
import { Vaius } from "~/Client";
import Config from "~/config";
import { DATA_DIR, Millis } from "~/constants";
import { toTitle } from "~/util/text";
import { sleep } from "~/util/time";

type ReleaseType = "stable" | "beta" | "alpha";
type TestFlightStatus = "open" | "full" | "closed" | "unknown" | "notfound" | "ratelimited";

interface TrackerIndex {
    latest: Record<ReleaseType, number>;
}

interface iTunesResult {
    version: string;
    currentVersionReleaseDate: string;
    releaseNotes: string;
    artworkUrl100: string;
}

interface TFBuild {
    cfBundleShortVersion: string;
    cfBundleVersion: string;
    releaseDate: string;
    expiration: string;
    whatsNew: string;
    fileSizeUncompressed: number;
}

const { enabled, android, appstore, testflight, testflightSecret, testflightApi, logChannelId } = Config.updateTracker;

const DISCORD_PKG = "com.discord";
const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${DISCORD_PKG}`;
const TRACKER_BASE = "https://tracker.vendetta.rocks/tracker/download";
const TRACKER_INDEX = "https://tracker.vendetta.rocks/tracker/index";
const ANDROID_SPLITS = ["base", "config.arm64_v8a", "config.armeabi_v7a", "config.x86_64", "config.x86", "config.hdpi", "config.xxhdpi", "config.de", "config.en"];
const ANDROID_COLORS: Record<ReleaseType, number> = { stable: 0x675AF5, beta: 0xEE850B, alpha: 0xFEF40C };

const ITUNES_API = "https://itunes.apple.com/lookup?bundleId=com.hammerandchisel.discord&country=us";
const APP_STORE_URL = "https://apps.apple.com/app/discord/id985746746";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/gdE4pRzI";
const TESTFLIGHT_STATUS_LABELS: Record<TestFlightStatus, string> = {
    open: `[Join Beta](${TESTFLIGHT_URL})`,
    full: "Full",
    closed: "Closed",
    unknown: "Unknown",
    notfound: "Missing",
    ratelimited: "Rate Limited",
};

const DISCORD_ICON = "https://icons.duckduckgo.com/ip3/discord.com.ico";
const DISCORD_AUTHOR_NAME = "Discord - Talk, Play, Hang Out";

function readVersion(file: string): number {
    try {
        return parseInt(fs.readFileSync(file, "utf-8").trim(), 10) || 0;
    } catch {
        return 0;
    }
}

function writeVersion(file: string, version: number): void {
    fs.writeFileSync(file, version.toString(), "utf-8");
}

function formatDate(date: string | Date): string {
    return new Date(date).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "long",
        timeStyle: "short",
    });
}

function resolveChannelIds(extraChannelId?: string): string[] {
    const ids = [logChannelId];
    if (extraChannelId && extraChannelId !== logChannelId) {
        ids.push(extraChannelId);
    }
    return ids;
}

async function postEmbed(channelIds: string[], embed: object, tag: string): Promise<void> {
    for (const channelId of channelIds) {
        try {
            await Vaius.rest.channels.createMessage(channelId, { embeds: [embed] });
        } catch (err) {
            console.error(`[UpdateTracker ${tag}] Failed to post to ${channelId}:`, err);
        }
    }
}

function trackerUrl(buildID: number, split: string): string {
    return `${TRACKER_BASE}/${buildID}/${split}`;
}

function vendettaLinks(versionCode: number): string {
    return ANDROID_SPLITS.map(s => `[${s}.apk](${trackerUrl(versionCode, s)})`).join("\n");
}

function versionCodeToName(versionCode: number): string {
    const str = versionCode.toString();
    return `${str.slice(0, 3)}.${parseInt(str.slice(4))}`;
}

async function fetchLatestVersions(): Promise<TrackerIndex["latest"]> {
    const resp = await fetch(TRACKER_INDEX);
    if (!resp.ok) throw new Error(`Vendetta tracker fetch failed: ${resp.statusText}`);
    const json: TrackerIndex = await resp.json();
    return json.latest;
}

export async function checkAndroid(bypass = false, extraChannelId?: string): Promise<void> {
    let latest: TrackerIndex["latest"];

    try {
        latest = await fetchLatestVersions();
    } catch (err) {
        console.error("[UpdateTracker Android] Failed to fetch version:", err);
        return;
    }

    const channelIds = resolveChannelIds(extraChannelId);

    for (const releaseType of ["stable", "beta", "alpha"] as ReleaseType[]) {
        const versionCode = latest[releaseType];
        const versionFile = join(DATA_DIR, `./discord_version.android.${releaseType}.txt`);

        if (!bypass && readVersion(versionFile) >= versionCode) continue;

        const embed = {
            author: { name: DISCORD_AUTHOR_NAME, url: GOOGLE_PLAY_URL, iconURL: DISCORD_ICON },
            title: `New Android ${toTitle(releaseType)} Release: ${versionCodeToName(versionCode)} (${versionCode})`,
            description: `Build \`${versionCode}\` is now available.\nDetected at ${formatDate(new Date())}`,
            fields: [
                { name: "Google Play Store", value: GOOGLE_PLAY_URL, inline: true },
                { name: "Vendetta Tracker", value: vendettaLinks(versionCode), inline: true },
            ],
            color: ANDROID_COLORS[releaseType],
        };

        await postEmbed(channelIds, embed, `Android ${releaseType}`);
        writeVersion(versionFile, versionCode);
    }
}

async function fetchAppStoreVersion(): Promise<iTunesResult> {
    const resp = await fetch(ITUNES_API);
    if (!resp.ok) throw new Error(`iTunes API failed: ${resp.statusText}`);

    const json = await resp.json();
    if (!json.results?.length) throw new Error("No results from iTunes API");

    return json.results[0] as iTunesResult;
}

export async function checkAppStore(bypass = false, extraChannelId?: string): Promise<void> {
    const versionFile = join(DATA_DIR, "./discord_version.ios.txt");

    let result: iTunesResult;
    try {
        result = await fetchAppStoreVersion();
    } catch (err) {
        console.error("[UpdateTracker AppStore] Failed to fetch iOS version:", err);
        return;
    }

    const { version, currentVersionReleaseDate, releaseNotes, artworkUrl100 } = result;
    const versionCode = Number(version.replace(/\./g, ""));

    if (!bypass && readVersion(versionFile) >= versionCode) return;

    const embed = {
        author: { name: DISCORD_AUTHOR_NAME, url: APP_STORE_URL, iconURL: artworkUrl100 },
        title: `New App Store Release: ${version}`,
        description: releaseNotes.slice(0, 300) + (releaseNotes.length > 300 ? "…" : ""),
        fields: [
            { name: "Released", value: formatDate(currentVersionReleaseDate), inline: true },
            { name: "App Store", value: APP_STORE_URL, inline: true },
        ],
        color: 0x675AF5,
    };

    await postEmbed(resolveChannelIds(extraChannelId), embed, "AppStore");
    writeVersion(versionFile, versionCode);
}

async function getTestFlightStatus(): Promise<TestFlightStatus> {
    try {
        const resp = await fetch(TESTFLIGHT_URL);
        if (!resp.ok) return "unknown";
        if (resp.status === 404) return "notfound";
        if (resp.status === 429) return "ratelimited";

        const text = await resp.text();
        if (text.includes("Join the Beta")) return "open";
        if (text.includes("This beta is full.")) return "full";
        if (text.includes("This beta isn't accepting any new testers right now.")) return "closed";
        return "unknown";
    } catch {
        return "unknown";
    }
}

async function fetchTestFlightBuild(): Promise<TFBuild | null> {
    try {
        const resp = await fetch(testflightApi!, {
            headers: { Authorization: `Bearer ${testflightSecret}` },
        });
        if (!resp.ok) throw new Error(`TF API failed: ${resp.statusText}`);

        const build = (await resp.json())?.data?.[0]?.platforms?.[0]?.build;
        if (!build) return null;

        return {
            cfBundleShortVersion: build.cfBundleShortVersion,
            cfBundleVersion: build.cfBundleVersion,
            releaseDate: build.releaseDate,
            expiration: build.expiration,
            whatsNew: build.whatsNew,
            fileSizeUncompressed: build.fileSizeUncompressed,
        };
    } catch (err) {
        console.error("[UpdateTracker TestFlight] TF fetch failed:", err);
        return null;
    }
}

export async function checkTestFlight(bypass = false, extraChannelId?: string): Promise<void> {
    const versionFile = join(DATA_DIR, "./discord_version.testflight.txt");

    const build = await fetchTestFlightBuild();
    if (!build) return;

    const versionCode = Number(build.cfBundleVersion);

    if (!bypass && readVersion(versionFile) >= versionCode) return;

    const embed = {
        author: { name: DISCORD_AUTHOR_NAME, url: TESTFLIGHT_URL, iconURL: DISCORD_ICON },
        title: `New TestFlight Release: ${build.cfBundleShortVersion} (${build.cfBundleVersion})`,
        description: build.whatsNew,
        fields: [
            { name: "Released", value: formatDate(build.releaseDate), inline: true },
            { name: "Expires", value: formatDate(build.expiration), inline: true },
            { name: "Size", value: `${(build.fileSizeUncompressed / (1024 * 1024)).toFixed(1)} MB`, inline: true },
            { name: "Beta Status", value: TESTFLIGHT_STATUS_LABELS[await getTestFlightStatus()], inline: true },
        ],
        color: 0xEE850B,
    };

    await postEmbed(resolveChannelIds(extraChannelId), embed, "TestFlight");
    writeVersion(versionFile, versionCode);
}

export function initUpdateTracker(): void {
    if (!enabled) return;

    (async () => {
        while (true) {
            if (android) await checkAndroid();
            if (appstore) await checkAppStore();
            if (testflight) await checkTestFlight();
            await sleep(5 * Millis.MINUTE);
        }
    })();
}
