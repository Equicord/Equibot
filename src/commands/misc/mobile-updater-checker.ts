import { defineCommand } from "~/Commands";
import Config from "~/config";
import { checkAndroid } from "~/modules/updateTracker/android";
import { checkIos } from "~/modules/updateTracker/ios";
import { reply } from "~/util/discord";

defineCommand({
    enabled: Config.updateTracker.enabled,

    name: "mobile",
    description: "Check if anything new mobile builds released",
    usage: "",
    aliases: ["m"],
    modOnly: true,

    async execute({ msg }) {
        if (Config.updateTracker.android) await checkAndroid(true, msg.channelID);
        if (Config.updateTracker.ios) await checkIos(true, msg.channelID);

        reply(msg, "Now checking for new mobile releases!");
    },
});
