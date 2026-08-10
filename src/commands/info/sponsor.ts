import { defineCommand } from "~/Commands";

defineCommand({
    name: "sponsor",
    aliases: ["dono"],
    description: "Get sponsor link for the development of Equicord and related projects",
    usage: null,
    async execute({ reply }) {
        return reply(
            "## $1 a month" +
            "\n" +
            "- You'll get your GitHub profile featured on all Equicord related repositories." +
            "\n" +
            "- You'll get a donator Equicord profile badge (non-custom) (visible to all Equicord users)" +
            "\n" +
            "- You'll get a Sponsor badge on your GitHub profile." +
            "\n" +
            "## $5 a month" +
            "\n" +
            "* All previous tier perks." +
            "\n" +
            "* Custom Equicord profile badge." +
            "\n" +
            "  * This badge is visible to Equicord users and people who use global badges on the various platforms" +
            "\n" +
            "  * **Badge Design Rules:**" +
            "\n" +
            '    * Cannot be blue or resemble corporate icons (Roblox, X/Twitter, etc.), nor claim roles like "Owner", "Developer/Maintainer" or "Staff/Admin/Moderator". Unique shapes and other colors are allowed.' +
            "\n" +
            "    * No NSFW content, existing Discord or client mod badges (Vencord, BD, RePlugged, etc.), or offensive symbols (swastikas, etc.)." +
            "\n" +
            "* For an additional $3, you'll get another custom badge (up to 5 total)." +
            "\n\n" +
            "Donate: https://github.com/sponsors/thororen1234"
        );

    }
});
