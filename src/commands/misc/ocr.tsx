import { Message, MessageFlags } from "oceanic.js";
import { registerMessageCommand } from "~/SlashCommands";
import { fetchBuffer } from "~/util/fetch";
import { readTextFromImage } from "~/util/ocr";
import { toCodeblock } from "~/util/text";

registerMessageCommand({
    name: "OCR",
    async handle(interaction) {
        const msg = interaction.data.target as Message;

        const flags = MessageFlags.EPHEMERAL

        if (!msg.attachments.size)
            return interaction.reply({ content: "No attachments found.", flags });

        await interaction.defer(flags);

        const imageData = await fetchBuffer(msg.attachments.first()!.url);

        const text = await readTextFromImage(imageData);

        return interaction.reply({ content: `## Extracted text\n${toCodeblock(text)}`, flags });
    }
})
