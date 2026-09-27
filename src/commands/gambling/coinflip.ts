import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { registerChatInputCommand } from "~/SlashCommands";
import { toCodeblock } from "~/util/text";
import { CommandStringOption } from "~components";

function flipCoin(bet?: string) {
    const resultIsHeads = Math.random() < 0.5;
    const result = resultIsHeads ? "Heads" : "Tails";
    const response = `${Emoji.Coin} ${result}!`;

    if (!bet) {
        return response;
    }

    bet = bet.toLowerCase();

    const betIsHeads = "heads".startsWith(bet);
    if (!betIsHeads && !"tails".startsWith(bet)) {
        return `What's a ${toCodeblock(bet)}`;
    }

    const won = resultIsHeads === betIsHeads;

    return `${response} You ${won ? "won" : "lost"}`;
}

defineCommand({
    name: "coinflip",
    description: "Heads or tails?",
    usage: "[bet]>",
    aliases: ["cf", "coin", "flip"],
    execute({ reply }, bet) {
        return reply(flipCoin(bet));
    },
});

registerChatInputCommand(
    {
        name: "coinflip",
        description: "Heads or tails?",
        options: [
            CommandStringOption({
                name: "bet",
                description: "What you're betting on",
                choices: [
                    { name: "Heads", value: "heads" },
                    { name: "Tails", value: "tails" }
                ]
            })
        ]
    },
    {
        handle(interaction) {
            const bet = interaction.data.options.getString("bet");
            return interaction.reply({ content: flipCoin(bet) });
        }
    }
);
