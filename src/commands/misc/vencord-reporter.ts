import { defineCommand } from "~/Commands";
import Config from "~/config";
import { BotState } from "~/db/botState";
import { DefaultReporterBranch, testDiscordVersion } from "~/modules/discordTracker";
import { reply } from "~/util/discord";

defineCommand({
    enabled: Config.reporter.enabled,

    name: "reporter",
    description: "Run the Equicord reporter workflow",
    usage: "[ref = dev] [branch = both]",
    aliases: ["report", "equicord-reporter", "test-patches", "test", "rep", "r"],
    modOnly: true,

    async execute({ msg }, ref = DefaultReporterBranch, branch = "both") {
        testDiscordVersion(
            branch as any,
            {
                stable: BotState.discordTracker?.stableHash!,
                canary: BotState.discordTracker?.canaryHash!
            },
            {
                ref,
                shouldLog: false,
                shouldUpdateStatus: ref === DefaultReporterBranch,
                onSubmit: (_report, data) => {
                    reply(msg, data);
                }
            }
        );

        reply(msg, "Now testing!");
    },
});
