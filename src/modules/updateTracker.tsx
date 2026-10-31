import { createHmac, timingSafeEqual } from "crypto";
import fs from "fs";
import { ButtonStyles, MessageFlags, SeparatorSpacingSize } from "oceanic.js";
import { join } from "path";
import { Vaius } from "~/Vaius";
import Config from "~/config";
import { DATA_DIR, Millis } from "~/constants";
import { fastify } from "~/server";
import { toTitle } from "~/util/text";
import { sleep } from "~/util/time";

import { ActionRow, Button, Container, Section, Separator, TextDisplay, Thumbnail } from "~components";

type ReleaseType = "stable" | "beta" | "alpha";
type TestFlightStatus = "open" | "full" | "closed" | "unknown" | "notfound" | "ratelimited";

interface AndroidRelease {
    versionCode: number;
    version: string;
    versionName: string | null;
    releasedAt: string | null;
    fileSizeBytes: number | null;
    targetSdkVersion: number | null;
    releaseNotes: string | null;
}

interface AppStoreRelease {
    version: string;
    releasedAt: string | null;
    minimumOsVersion: string | null;
    fileSizeBytes: number | null;
    releaseNotes: string | null;
}

interface TestFlightRelease {
    version: string;
    build: string;
    releasedAt: string | null;
    expiresAt: string | null;
    fileSizeBytes: number | null;
    whatsNew: string | null;
}

interface TestFlightProgram {
    joinUrl: string;
    status: TestFlightStatus;
    checkedAt: string;
}

interface TrackerIndex {
    android: { latest: Record<ReleaseType, AndroidRelease | null> };
    ios: {
        latest: { appstore: AppStoreRelease | null; testflight: TestFlightRelease | null };
        testflight: TestFlightProgram | null;
    };
}

type TrackerEvent =
    | { type: "android"; channel: ReleaseType; release: AndroidRelease; previousVersionCode: number | null }
    | { type: "appstore"; release: AppStoreRelease; previousVersion: string | null }
    | { type: "testflight"; release: TestFlightRelease; previousBuild: string | null; program: TestFlightProgram | null };

const { enabled, android, appstore, testflight, api, webhookSecret, logChannelId } = Config.updateTracker;

const TRACKER_API = api.replace(/\/+$/, "");
const TRACKER_BASE = `${TRACKER_API}/android/download`;
const TRACKER_INDEX = `${TRACKER_API}/index`;

const FALLBACK_POLL_INTERVAL = webhookSecret ? 30 * Millis.MINUTE : 5 * Millis.MINUTE;

const DISCORD_PKG = "com.discord";
const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${DISCORD_PKG}`;

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

let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
}

async function fetchTrackerIndex(): Promise<TrackerIndex> {
    const resp = await fetch(TRACKER_INDEX);
    if (!resp.ok) throw new Error(`Tracker index fetch failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
}

function trackerUrl(buildID: number, split: string): string {
    return `${TRACKER_BASE}/${buildID}/${split}`;
}

function formatReleaseName(versionCode: number, releaseType: ReleaseType): string {
    const str = versionCode.toString();
    const versionStr = `${str.slice(0, 3)}.${parseInt(str.slice(4))}`;
    return `**${versionStr} ${toTitle(releaseType)}** · \`${versionCode}\``;
}

export function checkAndroid(bypass = false, extraChannelId?: string, latest?: Partial<Record<ReleaseType, AndroidRelease | null>>): Promise<void> {
    return serialized(async () => {
        if (!latest) {
            try {
                latest = (await fetchTrackerIndex()).android.latest;
            } catch (err) {
                console.error("[UpdateTracker Android] Failed to fetch version:", err);
                return;
            }
        }

        const channelIds = resolveChannelIds(extraChannelId);

        for (const releaseType of ["stable", "beta", "alpha"] as ReleaseType[]) {
            const release = latest[releaseType];
            if (!release) continue;

            const { versionCode } = release;
            const versionFile = join(DATA_DIR, `./discord_version.android.${releaseType}.txt`);

            if (!bypass && readVersion(versionFile) >= versionCode) continue;

            const name = formatReleaseName(versionCode, releaseType);
            const accentColor = ANDROID_COLORS[releaseType];
            const { fileSizeBytes, targetSdkVersion: sdk } = release;
            const notes = release.releaseNotes?.trim();
            const links = (splits: [string, string][]) =>
                splits.map(([label, split]) => `[${label}](${trackerUrl(versionCode, split)})`).join(" · ");

            const components = <>
                <Container accentColor={accentColor}>
                    <Section accessory={<Thumbnail url={`${Config.httpServer.domain}/public/googleplay.png`} />}>
                        <TextDisplay>### New Android Release</TextDisplay>
                        <TextDisplay>{`${name}\n-# Detected <t:${Math.floor(Date.now() / 1000)}:f>`}</TextDisplay>
                        <TextDisplay>{[
                            `**Size:** ${fileSizeBytes === null ? "?" : `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`}`,
                            // API 33+ maps to Android (sdk - 20); Discord hasn't targeted anything older in years
                            `**Targets:** ${sdk === null ? "?" : sdk >= 33 ? `Android ${sdk - 20}` : `API ${sdk}`}`,
                        ].join("\n")}</TextDisplay>
                    </Section>
                    {notes && <Separator spacing={SeparatorSpacingSize.SMALL} />}
                    {notes && <TextDisplay>{"**What's New**\n" + (notes.length > 600 ? notes.slice(0, 600).trimEnd() + "…" : notes).split("\n").map(l => `> ${l.trim()}`).join("\n")}</TextDisplay>}
                    <Separator spacing={SeparatorSpacingSize.SMALL} />
                    <TextDisplay>{[
                        "**Downloads**",
                        `**Core:** ${links([["base.apk", "base"]])}`,
                        `**Architecture:** ${links([["arm64_v8a", "config.arm64_v8a"], ["armeabi_v7a", "config.armeabi_v7a"], ["x86_64", "config.x86_64"], ["x86", "config.x86"]])}`,
                        `**Density:** ${links([["hdpi", "config.hdpi"], ["xxhdpi", "config.xxhdpi"]])}`,
                        `**Language:** ${links([["English", "config.en"], ["German", "config.de"]])}`,
                    ].join("\n")}</TextDisplay>
                </Container>
                <ActionRow>
                    <Button style={ButtonStyles.LINK} url={GOOGLE_PLAY_URL}>Google Play Store</Button>
                    {["alpha", "beta"].includes(releaseType) && <Button style={ButtonStyles.LINK} url={HOW_TO_JOIN_URL_ALPHA}>How to Join</Button>}
                </ActionRow>
            </>;

            await postUpdateMessage(channelIds, components as any, `Android ${releaseType}`);
            fs.writeFileSync(versionFile, versionCode.toString(), "utf-8");
        }
    });
}

export function checkAppStore(bypass = false, extraChannelId?: string, release?: AppStoreRelease | null): Promise<void> {
    return serialized(async () => {
        const versionFile = join(DATA_DIR, "./discord_version.ios.txt");

        if (release === undefined) {
            try {
                release = (await fetchTrackerIndex()).ios.latest.appstore;
            } catch (err) {
                console.error("[UpdateTracker AppStore] Failed to fetch iOS version:", err);
                return;
            }
        }
        if (!release) return;

        const { version } = release;
        const versionCode = Number(version.replace(/\./g, ""));

        if (!bypass && readVersion(versionFile) >= versionCode) return;

        const { fileSizeBytes, releasedAt } = release;
        const notes = release.releaseNotes?.trim();

        const components = <>
            <Container accentColor={0x007AFF}>
                <Section accessory={<Thumbnail url={`${Config.httpServer.domain}/public/appstore.png`} />}>
                    <TextDisplay>### New App Store Release</TextDisplay>
                    <TextDisplay>{`**${version}**\n-# Detected <t:${Math.floor(Date.now() / 1000)}:f>`}</TextDisplay>
                    <TextDisplay>{[
                        `**Size:** ${fileSizeBytes === null ? "?" : `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`}`,
                        `**Requires:** iOS ${release.minimumOsVersion ?? "?"}+`,
                        releasedAt && `**Released:** <t:${Math.floor(Date.parse(releasedAt) / 1000)}:f>`,
                    ].filter(Boolean).join("\n")}</TextDisplay>
                </Section>
                {notes && <Separator spacing={SeparatorSpacingSize.SMALL} />}
                {notes && <TextDisplay>{"**What's New**\n" + (notes.length > 600 ? notes.slice(0, 600).trimEnd() + "…" : notes).split("\n").map(l => `> ${l.trim()}`).join("\n")}</TextDisplay>}
            </Container>
            <ActionRow>
                <Button style={ButtonStyles.LINK} url={APP_STORE_URL}>View on App Store</Button>
            </ActionRow>
        </>;

        await postUpdateMessage(resolveChannelIds(extraChannelId), components as any, "AppStore");
        fs.writeFileSync(versionFile, versionCode.toString(), "utf-8");
    });
}

export function checkTestFlight(bypass = false, extraChannelId?: string, release?: TestFlightRelease | null, program?: TestFlightProgram | null): Promise<void> {
    return serialized(async () => {
        const versionFile = join(DATA_DIR, "./discord_version.testflight.txt");

        if (release === undefined) {
            try {
                const { ios } = await fetchTrackerIndex();
                release = ios.latest.testflight;
                program = ios.testflight;
            } catch (err) {
                console.error("[UpdateTracker TestFlight] Failed to fetch build:", err);
                return;
            }
        }
        if (!release) return;

        const versionCode = Number(release.build);

        if (!bypass && readVersion(versionFile) >= versionCode) return;

        const status = program?.status ?? "unknown";
        const { fileSizeBytes, releasedAt, expiresAt } = release;

        // whatsNew is CI output: a disclaimer line followed by "Key: value" lines
        const lines = release.whatsNew?.split("\n").map(l => l.trim()).filter(Boolean) ?? [];
        const info = lines.length > 0 && ["**Build Info**", ...lines.map(line => {
            const match = line.match(/^([\w ]+):\s*(.+)$/);
            return match ? `**${match[1]}:** \`${match[2]}\`` : `-# ${line}`;
        })].join("\n");

        const components = <>
            <Container accentColor={0xFF6B35}>
                <Section accessory={<Thumbnail url={`${Config.httpServer.domain}/public/testflight.png`} />}>
                    <TextDisplay>### New TestFlight Release</TextDisplay>
                    <TextDisplay>{`**${release.version}** · Build \`${release.build}\`\n-# Detected <t:${Math.floor(Date.now() / 1000)}:f>`}</TextDisplay>
                    <TextDisplay>{[
                        `**Status:** ${TESTFLIGHT_STATUS_LABELS[status] ?? TESTFLIGHT_STATUS_LABELS.unknown}`,
                        `**Size:** ${fileSizeBytes === null ? "?" : `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`}`,
                        releasedAt && `**Released:** <t:${Math.floor(Date.parse(releasedAt) / 1000)}:f>`,
                        expiresAt && `**Expires:** <t:${Math.floor(Date.parse(expiresAt) / 1000)}:R>`,
                    ].filter(Boolean).join("\n")}</TextDisplay>
                </Section>
                {info && <Separator spacing={SeparatorSpacingSize.SMALL} />}
                {info && <TextDisplay>{info}</TextDisplay>}
            </Container>
            <ActionRow>
                {status === "open" && <Button style={ButtonStyles.LINK} url={program?.joinUrl ?? TESTFLIGHT_URL}>Join TestFlight</Button>}
                <Button style={ButtonStyles.LINK} url={HOW_TO_JOIN_URL_TF}>How to Join</Button>
            </ActionRow>
        </>;

        await postUpdateMessage(resolveChannelIds(extraChannelId), components as any, "TestFlight");
        fs.writeFileSync(versionFile, versionCode.toString(), "utf-8");
    });
}

function isTrackerEvent(value: any): value is TrackerEvent {
    if (typeof value !== "object" || value === null || typeof value.release !== "object" || value.release === null) return false;
    switch (value.type) {
        case "android":
            return ["stable", "beta", "alpha"].includes(value.channel) && typeof value.release.versionCode === "number";
        case "appstore":
            return typeof value.release.version === "string";
        case "testflight":
            return typeof value.release.version === "string" && typeof value.release.build === "string";
        default:
            return false;
    }
}

async function handleTrackerEvent(event: TrackerEvent): Promise<void> {
    switch (event.type) {
        case "android":
            if (android) await checkAndroid(false, undefined, { [event.channel]: event.release });
            break;
        case "appstore":
            if (appstore) await checkAppStore(false, undefined, event.release);
            break;
        case "testflight":
            if (testflight) await checkTestFlight(false, undefined, event.release, event.program);
            break;
    }
}

if (enabled && webhookSecret) {
    fastify.register(async fastify => {
        fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
            done(null, body);
        });

        fastify.post("/webhook", async (req, res) => {
            const body = req.body as Buffer;
            const signature = String(req.headers["x-signature"] ?? "").replace("sha256=", "");

            const expected = createHmac("sha256", webhookSecret).update(body).digest();
            const given = Buffer.from(signature, "hex");
            if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
                res.status(401).send("Invalid X-Signature");
                return;
            }

            let event: unknown;
            try {
                event = JSON.parse(body.toString("utf-8"))?.event;
            } catch {
                res.status(400).send("Invalid JSON");
                return;
            }
            if (!isTrackerEvent(event)) {
                res.status(400).send("Unknown event");
                return;
            }

            await handleTrackerEvent(event);
            res.status(200).send();
        });
    }, {
        prefix: "/update-tracker"
    });
}

export function initUpdateTracker(): void {
    if (!enabled) return;
    if (!TRACKER_API) {
        console.error("[UpdateTracker] UPDATE_TRACKER_API is not set");
        return;
    }

    (async () => {
        while (true) {
            try {
                const index = await fetchTrackerIndex();
                if (android) await checkAndroid(false, undefined, index.android.latest);
                if (appstore) await checkAppStore(false, undefined, index.ios.latest.appstore);
                if (testflight) await checkTestFlight(false, undefined, index.ios.latest.testflight, index.ios.testflight);
            } catch (err) {
                console.error("[UpdateTracker] Failed to fetch tracker index:", err);
            }
            await sleep(FALLBACK_POLL_INTERVAL);
        }
    })();
}
