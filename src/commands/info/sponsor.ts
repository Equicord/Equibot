import { defineCommand } from "~/Commands";

defineCommand({
    name: "sponsor",
    aliases: ["dono"],
    description: "Get sponsor link for the development of Equicord and related projects",
    usage: null,
    async execute({ reply }) {
        return reply(
            "You can support Equicord and related projects by donating here: https://github.com/sponsors/thororen1234" +
            "\n" +
            "If you can't use GitHub for donations please make a ticket here: https://discord.com/channels/1173279886065029291/1300883665244389478"
        );

    }
});
