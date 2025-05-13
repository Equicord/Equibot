import { defineCommand } from "~/Commands";
import { BotState } from "~/db/botState";
import { DefaultReporterBranch, testDiscordVersion } from "~/modules/discordTracker";
import { reply } from "~/util/discord";

defineCommand({
    name: "reporter",
    description: "Run the Equicord reporter workflow",
    usage: "[ref = dev] [branch = both]",
    aliases: ["report", "equicord-reporter", "test-patches", "test"],
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
                onSubmit: (_report, data) => {
                    reply(msg, data);
                }
            }
        );

        reply(msg, "Now testing!");
    },
});
