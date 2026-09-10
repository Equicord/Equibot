import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji } from "~/constants";
import { silently } from "~/util/functions";

const FOTD_CHANNEL_ID = "1547329048177414185";
const FOTD_ROLE_ID = "1547329300586434740";
const FOTD_ROLE_PINGERS = "1547574643639197726";

defineCommand({
    name: "fotd",
    description: "Sends the fact of the day ping",
    usage: "",
    guildOnly: true,
    async execute({ msg }) {
        const isStaff = msg.member.roles.some(r => [Config.roles.mod, Config.roles.helper].includes(r));
        if (!isStaff && !msg.member.roles.includes(FOTD_ROLE_PINGERS))
            return silently(msg.createReaction(Emoji.Anger));

        await msg.client.rest.channels.createMessage(FOTD_CHANNEL_ID, {
            content: `<@&${FOTD_ROLE_ID}>`,
            allowedMentions: {
                roles: [FOTD_ROLE_ID],
            },
        });
    },
});
