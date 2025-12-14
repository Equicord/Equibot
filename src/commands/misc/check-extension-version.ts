import { defineCommand } from "~/Commands";
import { Millis } from "~/constants";
import { execFileP } from "~/util/childProcess";
import { makeCachedJsonFetch } from "~/util/fetch";
import { ttlLazy, ttlLazyFailure } from "~/util/lazy";

interface GithubTag {
    name: string;
}

const VersionRe = />Version<\/(?:div|dt)><(?:div|dd) class="[^"]+">(\d+(?:\.\d+)+)<\/(?:div|dd)>/;
const EdgeVersionRe = /"version"\s*:\s*"([^"]+)"/;

const getGithubTags = makeCachedJsonFetch<GithubTag[]>("https://api.github.com/repos/Equicord/Equicord/tags");

function compareVersions(a: string, b: string) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    const len = Math.max(pa.length, pb.length);

    for (let i = 0; i < len; i++) {
        const na = pa[i] ?? 0;
        const nb = pb[i] ?? 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

function getBrowserVersion(url: string, versionRe: RegExp) {
    return ttlLazy(async () => {
        const { stdout } = await execFileP("curl", [url]);
        const version = versionRe.exec(stdout)?.[1];
        return version ?? ttlLazyFailure;
    }, 5 * Millis.MINUTE);
}

const getChromeVersion = getBrowserVersion("https://chromewebstore.google.com/detail/equicord-web/mcambpfmpjnncfoodejdmehedbkjepmi", VersionRe);
const getFirefoxVersion = getBrowserVersion("https://addons.mozilla.org/en-US/firefox/addon/equicord-web/", VersionRe);
const getEdgeVersion = getBrowserVersion("https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/nelknkpngcgdndlgikhfmldidjdjljgd", EdgeVersionRe);

defineCommand({
    name: "check-extension-version",
    description: "Check the version of the extension",
    aliases: ["extversion", "ext", "ev"],
    usage: "[chrome|firefox|edge]",
    async execute(context, ...args) {
        const { reply } = context;

        const browsers = [
            { name: "chrome", displayName: "Chrome", getVersion: getChromeVersion },
            { name: "firefox", displayName: "Firefox", getVersion: getFirefoxVersion },
            { name: "edge", displayName: "Edge", getVersion: getEdgeVersion }
        ];

        const [latestTag] = await getGithubTags();
        const latestVersion = latestTag.name.replace(/^v/, "");
        const firstArg = args[0]?.toLowerCase();

        let filteredBrowsers = browsers;

        if (firstArg) {
            filteredBrowsers = browsers.filter(b => b.name === firstArg);
            if (filteredBrowsers.length === 0) {
                await reply(`Unknown browser "${args[0]}". Please use chrome, firefox, or edge.`);
                return;
            }
        }

        const messages: string[] = [];

        await Promise.all(
            filteredBrowsers.map(async ({ displayName, getVersion }) => {
                const version = await getVersion();
                if (!version) {
                    messages.push(`Failed to look up the Equicord ${displayName} Extension version :(`);
                    return;
                }

                const cmp = compareVersions(version, latestVersion);

                if (cmp === 0) {
                    messages.push(`The Equicord ${displayName} Extension is up to date! (v${version})`);
                } else if (cmp > 0) {
                    messages.push(`The Equicord ${displayName} Extension is newer than the latest GitHub release! (v${version} vs v${latestVersion})`);
                } else {
                    messages.push(`The Equicord ${displayName} Extension is out of date! (v${version} vs v${latestVersion})`);
                }
            })
        );

        await reply(messages.join("\n"));
    }
});
