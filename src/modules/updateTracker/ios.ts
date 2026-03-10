import { Vaius } from "~/Client";
import Config from "~/config";
import { readVersion, writeVersion } from "./utils";

const ITUNES_API = "https://itunes.apple.com/lookup?bundleId=com.hammerandchisel.discord&country=us";
const APP_STORE_URL = "https://apps.apple.com/app/discord/id985746746";

interface iTunesResult {
    version: string;
    currentVersionReleaseDate: string;
    releaseNotes: string;
    artworkUrl100: string;
}

async function fetchLatestIosVersion(): Promise<iTunesResult> {
    const resp = await fetch(ITUNES_API);
    if (!resp.ok) throw new Error(`iTunes API failed: ${resp.statusText}`);

    const json = await resp.json();
    if (!json.results?.length) throw new Error("No results from iTunes API");

    return json.results[0] as iTunesResult;
}

export async function checkIos(): Promise<void> {
    const versionFile = "./discord_version.ios.txt";
    const knownVersion = readVersion(versionFile);

    let result: iTunesResult;
    try {
        result = await fetchLatestIosVersion();
    } catch (err) {
        console.error("[updateTracker] Failed to fetch iOS version:", err);
        return;
    }

    const { version, currentVersionReleaseDate, releaseNotes, artworkUrl100 } = result;
    const versionCode = parseInt(version.replace(/\./g, ""), 10);

    if (knownVersion === 0) {
        writeVersion(versionFile, versionCode);
        return;
    }

    if (knownVersion < versionCode) {
        const releaseDate = new Date(currentVersionReleaseDate).toLocaleString("en-US", {
            timeZone: "America/New_York",
            dateStyle: "long",
            timeStyle: "short",
        });

        try {
            await Vaius.rest.channels.createMessage(Config.updateTracker.logChannelId, {
                embeds: [{
                    author: {
                        name: "Discord",
                        url: APP_STORE_URL,
                        iconURL: artworkUrl100,
                    },
                    title: `New Release: ${version}`,
                    description: releaseNotes.slice(0, 300) + (releaseNotes.length > 300 ? "…" : ""),
                    fields: [
                        { name: "Released", value: releaseDate, inline: true },
                    ],
                }],
            });
        } catch (err) {
            console.error("[updateTracker]", err);
        }

        writeVersion(versionFile, versionCode);
    }
}
