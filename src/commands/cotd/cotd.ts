import { defineCommand } from "~/Commands";
import { currentCotd } from "~/modules/regularCotd";
import { reply } from "~/util";

defineCommand({
    name: "cotd",
    description: "Shows the current color of the day",
    usage: null,
    async execute(msg, hex: string) {
        if (!currentCotd) {
            return reply(msg, "uhhh idk");
        }

        return reply(msg, {
            embeds: [{
                description: `The color of the day is ${currentCotd.name}!`,
                color: currentCotd.color,
                image: {
                    url: "attachment://blobcatcozy.png"
                }
            }],
            files: [{
                name: "blobcatcozy.png",
                contents: currentCotd.icon
            }]
        });
    }
});
