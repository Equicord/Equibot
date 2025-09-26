import { defineCommand } from "~/Commands";

defineCommand({
    name: "minky",
    aliases: ["mink", "minker"],
    description: "minker",
    usage: null,
    async execute({ reply }) {
        const url = "https://minky.materii.dev";

        const minker = await fetch(url)
            .then(r => r.ok ? r.arrayBuffer() : null);

        if (!minker)
            return reply("no mink :(");

        return reply({
            files: [{
                name: "mink.jpeg",
                contents: Buffer.from(minker)
            }]
        });
    }
});
