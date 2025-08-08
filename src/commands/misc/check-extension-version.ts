import { defineCommand } from "~/Commands";
import { doFetch, makeCachedJsonFetch } from "~/util/fetch";

interface GithubTag {
    name: string;
}

const VersionRe = />Version<\/div><div class="[^"]+">(\d+(?:\.\d+)+)<\/div>/;

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

defineCommand({
    name: "check-extension-version",
    description: "Check the version of the extension",
    aliases: ["extversion", "ext", "ev"],
    usage: null,
    async execute({ reply }) {
        const res = await doFetch("https://chromewebstore.google.com/detail/equicord-web/mcambpfmpjnncfoodejdmehedbkjepmi")
            .then(res => res.text());

        const version = VersionRe.exec(res)?.[1];
        if (!version) return reply("Failed to look up the Equicord Chrome Extension version :( Try again later!");

        const [latestTag] = await getGithubTags();
        const latestVersion = latestTag.name.replace(/^v/, "");

        const cmp = compareVersions(version, latestVersion);

        let message;
        if (cmp === 0) {
            message = `The Equicord Chrome Extension is up to date! (v${version})`;
        } else if (cmp > 0) {
            message = `The Equicord Chrome Extension is newer than the latest GitHub release! (v${version} vs v${latestVersion})`;
        } else {
            message = `The Equicord Chrome Extension is out of date! (v${version} vs v${latestVersion})`;
        }

        reply(message);
    }
});
