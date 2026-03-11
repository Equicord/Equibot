import { join } from "path";
import { Vaius } from "~/Client";
import Config from "~/config";
import { DATA_DIR } from "~/constants";
import { readVersion, writeVersion } from "./utils";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/gdE4pRzI";

interface TFBuild {
    cfBundleShortVersion: string;
    cfBundleVersion: string;
    releaseDate: string;
    expiration: string;
    whatsNew: string;
    fileSizeUncompressed: number;
}

type TestFlightStatus = "open" | "full" | "closed" | "unknown" | "notfound" | "ratelimited";

const TESTFLIGHT_STATUS_LABELS: Record<TestFlightStatus, string> = {
    open: `[Join Beta](${TESTFLIGHT_URL})`,
    full: "The beta is currently full",
    closed: "The beta is currently closed",
    unknown: "Unknown",
    notfound: "This beta is missing",
    ratelimited: "Currently rate limited by Apple. Please try again later"
};

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
    const { tfApi } = Config.updateTracker;
    try {
        const resp = await fetch(tfApi!);
        if (!resp.ok) throw new Error(`TF API failed: ${resp.statusText}`);

        const json = await resp.json();
        const build = json?.data?.[0]?.platforms?.[0]?.build;
        if (!build) return null;

        return {
            cfBundleShortVersion: build.cfBundleShortVersion,
            cfBundleVersion: build.cfBundleVersion,
            releaseDate: build.releaseDate,
            expiration: build.expiration,
            whatsNew: build.whatsNew,
            fileSizeUncompressed: build.fileSizeUncompressed
        };
    } catch (err) {
        console.error("[UpdateTracker TestFlight] TF fetch failed:", err);
        return null;
    }
}

export async function checkTestFlight(bypass = false, extraChannelId?: string) {
    const versionFile = join(DATA_DIR, "./discord_version.testflight.txt");
    const knownVersion = readVersion(versionFile);

    const build = await fetchTestFlightBuild();
    if (!build) return;

    const versionCode = Number(build.cfBundleVersion);

    if (!bypass && knownVersion >= versionCode) return;

    const releaseDate = new Date(build.releaseDate).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "long",
        timeStyle: "short"
    });

    const expiration = new Date(build.expiration).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "long",
        timeStyle: "short"
    });

    const channelIds = [Config.updateTracker.logChannelId];
    if (extraChannelId && extraChannelId !== Config.updateTracker.logChannelId) {
        channelIds.push(extraChannelId);
    }

    const testFlightStatus = await getTestFlightStatus();
    const sizeMB = (build.fileSizeUncompressed / (1024 * 1024)).toFixed(1);

    const embed = {
        author: {
            name: "Discord – Talk, Play, Hang Out",
            url: TESTFLIGHT_URL,
            iconURL: "https://icons.duckduckgo.com/ip3/discord.com.ico"
        },
        title: `New build released - ${build.cfBundleShortVersion} (${build.cfBundleVersion})`,
        description: build.whatsNew,
        fields: [
            {
                name: "Released",
                value: releaseDate,
                inline: true
            },
            {
                name: "Expires",
                value: expiration,
                inline: true
            },
            {
                name: "Size",
                value: `${sizeMB} MB`,
                inline: true
            },
            {
                name: "TestFlight",
                value: TESTFLIGHT_STATUS_LABELS[testFlightStatus],
                inline: true
            }
        ],
        color: 0x675AF5
    };

    for (const channelId of channelIds) {
        try {
            await Vaius.rest.channels.createMessage(channelId, { embeds: [embed] });
        } catch (err) {
            console.error("[UpdateTracker TestFlight]", err);
        }
    }

    writeVersion(versionFile, versionCode);
}
