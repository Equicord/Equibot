import { defineCommand } from "~/Commands";
import Config from "~/config";
import { checkAndroid, checkAppStore, checkTestFlight } from "~/modules/updateTracker";

const { enabled, android, appstore, testflight } = Config.updateTracker;

defineCommand({
    enabled,
    name: "mobile",
    description: "Check if anything new mobile builds released",
    usage: "",
    aliases: ["m"],
    allowedRoles: [Config.roles.mod],
    async execute({ msg }) {
        if (android) await checkAndroid(true, msg.channelID);
        if (appstore) await checkAppStore(true, msg.channelID);
        if (testflight) await checkTestFlight(true, msg.channelID);
    },
});
