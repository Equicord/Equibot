import { defineCommand } from "~/Commands";
import { reply } from "~/util";

type GamblingChoices = "grape" | "7" | "lemon" | "heart";
const emotes = {
    left: {
        7: "<:left_7:1286812727368749056>",
        grape: "<:left_grape:1286812728798740583>",
        heart: "<:left_heart:1286812729700777990>",
        lemon: "<:left_lemon:1286812730699022456>"
    },
    middle: {
        7: "<:middle_7:1286812731755991060>",
        grape: "<:middle_grape:1286812732745846826>",
        heart: "<:middle_heart:1286812733752213596>",
        lemon: "<:middle_lemon:1286812734658449520>"
    },
    right: {
        7: "<:right_7:1286812774562795591>",
        grape: "<:right_grape:1286812737908772874>",
        heart: "<:right_heart:1286812775984926823>",
        lemon: "<:right_lemon:1286812741365010492>"
    }
};

function gamble(edge: GamblingChoices | undefined = undefined): GamblingChoices {
    const randomInt = Math.floor(Math.random() * 40) + 1;
    const gambleResult = randomInt <= 10 ? "grape" : randomInt <= 20 ? "7" : randomInt <= 30 ? "lemon" : "heart";
    if (!edge) return gambleResult;
    else {
        if (gambleResult === edge) return gamble(edge);
        else return gambleResult;
    }
}

defineCommand({
    name: "gamble",
    aliases: ["g"],
    description: "Gamble your entire life savings",
    usage: "",
    async execute(msg) {
        const gambleMsg = await reply(msg, "Gambling in progress...");
        setTimeout(async () => {
            const leftGamble = gamble();
            const middleGamble = gamble();
            const rightGamble = function () {
                if (leftGamble !== middleGamble) return gamble();
                else return Math.floor(Math.random() * 40) + 1 < 6 ? gamble(leftGamble) : gamble();
            }();
            const gambleEmojis = `${emotes.left[leftGamble]}${emotes.middle[middleGamble]}${emotes.right[rightGamble]}`;
            const embed = {
                title: "Gambling results",
                description: `Sadly, you didn't win.\nYou gambled:\n# ${gambleEmojis}`,
                color: 0x202020
            };
            if (leftGamble === middleGamble && middleGamble === rightGamble) {
                switch (leftGamble) {
                    case "grape":
                        embed.title = ":grapes: Gambling results";
                        embed.description = `You won a grape!\nYou gambled:\n# ${gambleEmojis}`;
                        embed.color = 0xAA8DD8;
                        break;
                    case "7":
                        embed.title = ":seven: Big win";
                        embed.description = `You got a big win!\nYou gambled:\n# ${gambleEmojis}`;
                        embed.color = 0xD86A6F;
                        break;
                    case "lemon":
                        embed.title = ":lemon: Gambling results";
                        embed.description = `You won a lemon!\nYou gambled:\n# ${gambleEmojis}`;
                        embed.color = 0xFFCC4D;
                        break;
                    case "heart":
                        embed.title = ":heart: Gambling results";
                        embed.description = `You won a heart!\nYou gambled:\n# ${gambleEmojis}`;
                        embed.color = 0xDD2E44;
                        break;
                }
            }
            await gambleMsg.edit({
                content: "",
                embeds: [
                    embed
                ],
                allowedMentions: { repliedUser: false }
            });
        }, process.env.NODE_ENV === "development" ? 500 : Math.floor((Math.random() * (4 - 2.5) + 2.5) * 1000));
    }
});
