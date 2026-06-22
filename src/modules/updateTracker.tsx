import fs from "fs";
import { ButtonStyles, MessageFlags } from "oceanic.js";
import { join } from "path";
import { Vaius } from "~/Client";
import Config from "~/config";
import { DATA_DIR, Millis } from "~/constants";
import { toTitle } from "~/util/text";
import { sleep } from "~/util/time";

import { ActionRow, Button, Container, Section, TextDisplay, Thumbnail } from "~components";

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
    fileSizeBytes: string;
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

const ITUNES_API = "https://itunes.apple.com/lookup?bundleId=com.hammerandchisel.discord&country=us";
const APP_STORE_URL = "https://apps.apple.com/app/discord/id985746746";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/gdE4pRzI";
const HOW_TO_JOIN_URL_ALPHA = "https://support.discord.com/hc/en-us/articles/360035675191-Discord-Testing-Clients#h_01HT0CCGC6NZYJ4C7D6G0BAPAD";
const HOW_TO_JOIN_URL_TF = "https://support.discord.com/hc/en-us/articles/360035675191-Discord-Testing-Clients#h_01JZ8MGFQXGKTZ04NYM5415AGT";

const TESTFLIGHT_STATUS_LABELS: Record<TestFlightStatus, string> = {
    open: "Open",
    full: "Full",
    closed: "Closed",
    unknown: "Unknown",
    notfound: "Missing",
    ratelimited: "Rate Limited",
};

const ANDROID_COLORS: Record<ReleaseType, number> = { stable: 0x675AF5, beta: 0xEE850B, alpha: 0xFEF40C };

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

async function postUpdateMessage(channelIds: string[], components: any[], tag: string): Promise<void> {
    for (const channelId of channelIds) {
        try {
            const message = await Vaius.rest.channels.createMessage(channelId, {
                flags: MessageFlags.IS_COMPONENTS_V2,
                components,
            });
            await Vaius.rest.channels.crosspostMessage(channelId, message.id);
        } catch (err) {
            console.error(`[UpdateTracker ${tag}] Failed to post to ${channelId}:`, err);
        }
    }
}

function trackerUrl(buildID: number, split: string): string {
    return `${TRACKER_BASE}/${buildID}/${split}`;
}

function vendettaGrid(versionCode: number): string {
    const core = `[base.apk](${trackerUrl(versionCode, "base")})`;
    const arch = ["config.arm64_v8a", "config.armeabi_v7a", "config.x86_64", "config.x86"]
        .map(s => `[${s.replace("config.", "")}](${trackerUrl(versionCode, s)})`).join(" · ");
    const density = ["config.hdpi", "config.xxhdpi"]
        .map(s => `[${s.replace("config.", "")}](${trackerUrl(versionCode, s)})`).join(" · ");
    const lang = ["config.en", "config.de"]
        .map(s => `[${s === "config.en" ? "English (en)" : "German (de)"}](${trackerUrl(versionCode, s)})`).join(" · ");

    return [
        "**Core Files**",
        core,
        "",
        "**Architecture (CPU)**",
        arch,
        "",
        "**Screen Density (Display)**",
        density,
        "",
        "**Language**",
        lang,
    ].join("\n");
}

function formatReleaseName(versionCode: number, releaseType: ReleaseType): string {
    const str = versionCode.toString();
    const versionStr = `${str.slice(0, 3)}.${parseInt(str.slice(4))}`;
    const releaseStr = toTitle(releaseType);
    return `${versionStr} ${releaseStr} (${versionCode})`;
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

        const name = formatReleaseName(versionCode, releaseType);
        const accentColor = ANDROID_COLORS[releaseType];

        const components = <>
            <Container accentColor={accentColor}>
                <Section accessory={<Thumbnail url={`${Config.httpServer.domain}/public/google.png`} />}>
                    <TextDisplay>New Android Release</TextDisplay>
                    <TextDisplay>{name} · Detected {formatDate(new Date())}</TextDisplay>
                    <TextDisplay>{vendettaGrid(versionCode)}</TextDisplay>
                </Section>
            </Container>
            <ActionRow>
                <Button style={ButtonStyles.LINK} url={GOOGLE_PLAY_URL}>Google Play Store</Button>
                {["alpha", "beta"].includes(releaseType) && <Button style={ButtonStyles.LINK} url={HOW_TO_JOIN_URL_ALPHA}>How to Join</Button>}
            </ActionRow>
        </>;

        await postUpdateMessage(channelIds, components as any, `Android ${releaseType}`);
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

    const { version, currentVersionReleaseDate, releaseNotes, artworkUrl100, fileSizeBytes } = result;
    const versionCode = Number(version.replace(/\./g, ""));
    const size = (Number(fileSizeBytes) / (1024 * 1024)).toFixed(1);

    if (!bypass && readVersion(versionFile) >= versionCode) return;

    const description = releaseNotes.slice(0, 300) + (releaseNotes.length > 300 ? "…" : "");

    const components = <>
        <Container accentColor={0x007AFF}>
            <Section accessory={<Thumbnail url={`${Config.httpServer.domain}/public/appstore.png`} />}>
                <TextDisplay>New App Store Release</TextDisplay>
                <TextDisplay>{version} · {size} MB · Released {formatDate(currentVersionReleaseDate)}</TextDisplay>
                {description && <TextDisplay>{description}</TextDisplay>}
            </Section>
        </Container>
        <ActionRow>
            <Button style={ButtonStyles.LINK} url={APP_STORE_URL}>View on App Store</Button>
        </ActionRow>
    </>;

    await postUpdateMessage(resolveChannelIds(extraChannelId), components as any, "AppStore");
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

    const status = await getTestFlightStatus();
    const size = (build.fileSizeUncompressed / (1024 * 1024)).toFixed(1);

    const components = <>
        <Container accentColor={0xFF6B35}>
            <Section accessory={<Thumbnail url={`${Config.httpServer.domain}/public/testflight.png`} />}>
                <TextDisplay>New TestFlight Release</TextDisplay>
                <TextDisplay>{build.cfBundleShortVersion} · Build `{build.cfBundleVersion}` · {size} MB · Status: {TESTFLIGHT_STATUS_LABELS[status]}</TextDisplay>
                <TextDisplay>{build.whatsNew}</TextDisplay>
                <TextDisplay>Released {formatDate(build.releaseDate)} · Expires {formatDate(build.expiration)}</TextDisplay>
            </Section>
        </Container>
        <ActionRow>
            {status === "open" && <Button style={ButtonStyles.LINK} url={TESTFLIGHT_URL}>Join TestFlight</Button>}
            <Button style={ButtonStyles.LINK} url={HOW_TO_JOIN_URL_TF}>How to Join</Button>
        </ActionRow>
    </>;

    await postUpdateMessage(resolveChannelIds(extraChannelId), components as any, "TestFlight");
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
