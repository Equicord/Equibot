import { defineCommand } from "~/Commands";
import { Millis } from "~/constants";
import { execFileP } from "~/util/childProcess";
import { makeCachedJsonFetch } from "~/util/fetch";
import { ttlLazy, ttlLazyFailure } from "~/util/lazy";

interface GithubTag {
    name: string;
}

const VersionRe = />Version<\/(?:div|dt)><(?:div|dd) class="[^"]+">(\d+(?:\.\d+)+)<\/(?:div|dd)>/;
const EdgeVersionRe = /Version (\d+(?:\.\d+)+)/;

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
const getEdgeVersion = getBrowserVersion("https://microsoftedge.microsoft.com/addons/detail/equicord-web/nelknkpngcgdndlgikhfmldidjdjljgd", EdgeVersionRe);

defineCommand({
    name: "check-extension-version",
    description: "Check the version of the extension",
    aliases: ["extversion", "ext", "ev"],
    usage: null,
    async execute({ reply }) {
        const browsers = [
            { name: "Chrome", getVersion: getChromeVersion },
            { name: "Firefox", getVersion: getFirefoxVersion },
            { name: "Edge", getVersion: getEdgeVersion }
        ];

        const [latestTag] = await getGithubTags();
        const latestVersion = latestTag.name.replace(/^v/, "");

        const messages: string[] = [];

        await Promise.all(
            browsers.map(async ({ name, getVersion }) => {
                const version = await getVersion();
                if (!version) {
                    messages.push(`Failed to look up the Equicord ${name} Extension version :(`);
                    return;
                }

                const cmp = compareVersions(version, latestVersion);

                if (cmp === 0) {
                    messages.push(`The Equicord ${name} Extension is up to date! (v${version})`);
                } else if (cmp > 0) {
                    messages.push(`The Equicord ${name} Extension is newer than the latest GitHub release! (v${version} vs v${latestVersion})`);
                } else {
                    messages.push(`The Equicord ${name} Extension is out of date! (v${version} vs v${latestVersion})`);
                }
            })
        );

        reply(messages.join("\n"));
    }
});
