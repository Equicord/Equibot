import { defineCommand } from "~/Commands";
import { execFile } from "~/util/childProcess";
import { makeLazy } from "~/util/lazy";

export const getRemote = makeLazy(async () => {
    const res = await execFile("git", ["remote", "get-url", "origin"]);
    return res.stdout
        .trim()
        .replace(/\.git$/, "")
        .replace(/^git@(.+?):/, "https://$1/");
});

defineCommand({
    name: "source-code",
    aliases: ["source"],
    description: "Get the source code for this bot",
    usage: null,
    async execute({ reply }) {
        return reply("I am free software! You can find my Source code at " + await getRemote());
    }
});
