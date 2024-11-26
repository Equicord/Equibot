import { Embed } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { RULES_CHANNEL_ID } from "~/env";
import { reply, silently } from "~/util";

defineCommand({
    name: "rule",
    aliases: ["r"],
    description: "Query a rule and send it",
    usage: "<ruleNumber>",
    guildOnly: true,
    async execute({ msg, react }, ruleNumber) {
        if (!ruleNumber || isNaN(parseInt(ruleNumber)))
            return react(Emoji.QuestionMark);

        const rulesMessage = (
            await Vaius.rest.channels.getMessages(RULES_CHANNEL_ID)
        )[0].content;
        const rule = rulesMessage
            .substring(
                rulesMessage.indexOf(`${ruleNumber}. `),
                rulesMessage.indexOf(`${parseInt(ruleNumber) + 1}. `) !== -1
                    ? rulesMessage.indexOf(`${parseInt(ruleNumber) + 1}. `)
                    : rulesMessage.length
            )
            .trim()
            .replace(`${ruleNumber}. `, "");

        if (!rule) return react(Emoji.QuestionMark);

        const embed: Embed = {
            title: `Rule ${ruleNumber}`,
            description: rule,
            color: 0xdd7878,
        };

        const isReply = !!msg.referencedMessage;
        if (isReply) {
            silently(msg.delete());
            embed.footer = {
                text: `Auto-response invoked by ${msg.author.tag}`,
            };
            return msg.channel.createMessage({
                messageReference: {
                    messageID: msg.referencedMessage?.id ?? msg.id,
                },
                allowedMentions: { repliedUser: isReply },
                embeds: [embed],
            });
        }

        reply(msg, {
            embeds: [embed],
        });
    },
});
