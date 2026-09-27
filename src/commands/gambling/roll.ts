import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { registerChatInputCommand } from "~/SlashCommands";
import { randomInt } from "~/util/random";
import { CommandIntegerOption } from "~components";

const dieNames = ["d4", "d6", "d8", "d10", "d12", "d20"];

function rollDie(sides: string | number) {
    const limit = Number(sides);
    if (isNaN(limit) || limit < 1) {
        return "That's no valid die!";
    }

    const choice = randomInt(1, limit);

    return `${Emoji.Die} ${choice}`;
}

defineCommand({
    name: "roll",
    description: "Roll a die",
    aliases: ["dice", "die", "d", ...dieNames],
    usage: "[number of sides]",
    execute({ reply, commandName }, sides = "6") {
        if (dieNames.includes(commandName)) {
            sides = commandName.slice(1);
        }

        return reply(rollDie(sides));
    }
});

registerChatInputCommand(
    {
        name: "roll",
        description: "Roll a die",
        options: [
            CommandIntegerOption({ name: "sides", description: "Number of sides (default: 6)", minValue: 1 })
        ]
    },
    {
        handle(interaction) {
            const sides = interaction.data.options.getInteger("sides") ?? 6;
            return interaction.reply({ content: rollDie(sides) });
        }
    }
);
