import { join } from "path";
import { Vaius } from "~/Client";
import Config from "~/config";
import { DATA_DIR } from "~/constants";
import { readVersion, writeVersion } from "./utils";

const ITUNES_API = "https://itunes.apple.com/lookup?bundleId=com.hammerandchisel.discord&country=us";
const APP_STORE_URL = "https://apps.apple.com/app/discord/id985746746";
const TESTFLIGHT_URL = "https://testflight.apple.com/join/gdE4pRzI";

type TestFlightStatus = "open" | "full" | "closed" | "unknown" | "notfound" | "ratelimited";

interface iTunesResult {
    version: string;
    currentVersionReleaseDate: string;
    releaseNotes: string;
    artworkUrl100: string;
}

async function fetchIosVersion(): Promise<iTunesResult> {
    const resp = await fetch(ITUNES_API);
    if (!resp.ok) throw new Error(`iTunes API failed: ${resp.statusText}`);

    const json = await resp.json();
    if (!json.results?.length) throw new Error("No results from iTunes API");

    return json.results[0] as iTunesResult;
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

const TESTFLIGHT_STATUS_LABELS: Record<TestFlightStatus, string> = {
    open: `[Join Beta](${TESTFLIGHT_URL})`,
    full: "The beta is currently full",
    closed: "The beta is currently closed",
    unknown: "Unknown",
    notfound: "This beta is missing",
    ratelimited: "Currently rate limited by Apple. Please try again later"
};

export async function checkIos(bypass = false, extraChannelId?: string): Promise<void> {
    const versionFile = join(DATA_DIR, "./discord_version.ios.txt");
    const knownVersion = readVersion(versionFile);

    let result: iTunesResult;
    try {
        result = await fetchIosVersion();
    } catch (err) {
        console.error("[UpdateTracker] Failed to fetch iOS version:", err);
        return;
    }

    const { version, currentVersionReleaseDate, releaseNotes, artworkUrl100 } = result;
    const versionCode = Number(version.replace(/\./g, ""));

    if (!bypass && knownVersion >= versionCode) return;

    const releaseDate = new Date(currentVersionReleaseDate).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "long",
        timeStyle: "short",
    });

    const testFlightStatus = await getTestFlightStatus();

    const channelIds = [Config.updateTracker.logChannelId];
    if (extraChannelId && extraChannelId !== Config.updateTracker.logChannelId) {
        channelIds.push(extraChannelId);
    }

    const embed = {
        author: {
            name: "Discord - Talk, Play, Hang Out",
            url: APP_STORE_URL,
            iconURL: artworkUrl100,
        },
        title: `New App Store Release: ${version}`,
        description: releaseNotes.slice(0, 300) + (releaseNotes.length > 300 ? "…" : ""),
        fields: [
            { name: "Released", value: releaseDate, inline: true },
            { name: "App Store", value: APP_STORE_URL, inline: true },
            { name: "TestFlight", value: TESTFLIGHT_STATUS_LABELS[testFlightStatus], inline: true },
        ],
        color: 0x675AF5
    };

    for (const channelId of channelIds) {
        try {
            await Vaius.rest.channels.createMessage(channelId, { embeds: [embed] });
        } catch (err) {
            console.error("[UpdateTracker]", err);
        }
    }

    writeVersion(versionFile, versionCode);
}
