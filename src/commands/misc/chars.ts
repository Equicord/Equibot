import { defineCommand } from "~/Commands";
import { ZWSP } from "~/constants";
import { registerChatInputCommand } from "~/SlashCommands";
import { CommandStringOption } from "~components";

let unicodeNameMap: Record<number, string> | undefined;

async function requireMap() {
    if (!unicodeNameMap) {
        const data = await fetch("https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt")
            .then(res => res.text());

        unicodeNameMap = Object.fromEntries(
            data.trim().split("\n").map(line => {
                const [code, name] = line.split(";");
                return [parseInt(code, 16), name];
            }));
    }

    return unicodeNameMap;
}

async function inspectChars(text: string) {
    const map = await requireMap();

    const result = Array.from(text, (char, i) => {
        const name = map[char.codePointAt(0)!];

        return `${i === 0 ? ZWSP : ""}\`\`${ZWSP} ${char} ${ZWSP}\`\` ${name || "?"}`;
    }).join("\n");

    return result.length > 2000 ? "Result too long D:" : result;
}

defineCommand({
    name: "chars",
    aliases: ["ch", "charinfo", "char-info"],
    description: "Inspect the unicode characters in a string",
    usage: "<text>",
    rawContent: true,
    async execute({ msg, reply }, text) {
        text = text.replaceAll("\n", "") || msg.referencedMessage?.content!;

        if (!text)
            return reply("Please give me a proper input :(");

        return reply(await inspectChars(text));
    },
});

registerChatInputCommand(
    {
        name: "chars",
        description: "Inspect the unicode characters in a string",
        options: [
            CommandStringOption({ name: "text", description: "The text to inspect", required: true })
        ]
    },
    {
        async handle(interaction) {
            const text = interaction.data.options.getString("text", true);
            return interaction.reply({ content: await inspectChars(text) });
        }
    }
);
