import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji } from "~/constants";
import { silently } from "~/util/functions";

const FACT_CHANNEL_ID = "1547329048177414185";
const FACT_ROLE_ID = "1547329300586434740";
const EXTRA_ALLOWED_USER_ID = "463702169443368970";

defineCommand({
    name: "fact-of-the-day",
    description: "Sends the fact of the day ping",
    usage: "",
    aliases: ["fotd"],
    guildOnly: true,
    async execute({ msg }) {
        const isStaff = msg.member.roles.some(r => [Config.roles.mod, Config.roles.helper].includes(r));
        if (!isStaff && msg.author.id !== EXTRA_ALLOWED_USER_ID)
            return silently(msg.createReaction(Emoji.Anger));

        await msg.client.rest.channels.createMessage(FACT_CHANNEL_ID, {
            content: `<@${FACT_ROLE_ID}>`,
        });
    },
});
