import { defineCommand } from "~/Commands";
import Config from "~/config";
import { checkAndroid } from "~/modules/updateTracker/android";
import { checkAppStore } from "~/modules/updateTracker/appstore";
import { checkTestFlight } from "~/modules/updateTracker/testflight";

defineCommand({
    enabled: Config.updateTracker.enabled,

    name: "mobile",
    description: "Check if anything new mobile builds released",
    usage: "",
    aliases: ["m"],
    modOnly: true,

    async execute({ msg }) {
        if (Config.updateTracker.android) await checkAndroid(true, msg.channelID);
        if (Config.updateTracker.appstore) await checkAppStore(true, msg.channelID);
        if (Config.updateTracker.testflight) await checkTestFlight(true, msg.channelID);
    },
});
