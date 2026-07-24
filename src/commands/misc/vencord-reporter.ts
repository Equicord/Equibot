import { defineCommand } from "~/Commands";
import Config from "~/config";
import { BotState } from "~/db/botState";
import { DefaultReporterBranch, ReporterOptions, testDiscordVersion } from "~/modules/discordTracker";
import { reply } from "~/util/discord";

const PrRegex = /#(\d+)/;

defineCommand({
    enabled: Config.reporter.enabled,

    name: "reporter",
    description: "Run the Equicord reporter workflow",
    usage: "[ref = dev] [branch = both]",
    aliases: ["report", "equicord-reporter", "test-patches", "test", "rep", "r"],
    allowedRoles: [Config.roles.mod, Config.roles.helper],

    async execute({ msg }, ref = DefaultReporterBranch, branch = "both") {
        const options: ReporterOptions = { ref };

        let isPR = false;
        let prNumber = 0;
        if (PrRegex.test(ref)) {
            prNumber = parseInt(ref.match(PrRegex)![1]);
            isPR = true;

            options.ref = DefaultReporterBranch;
            options.inputRepository = "Equicord/Equicord";
            options.inputRef = `refs/pull/${prNumber}/head`;
        }

        testDiscordVersion(
            branch as any,
            {
                stable: BotState.discordTracker?.stableHash!,
                canary: BotState.discordTracker?.canaryHash!
            },
            {
                ...options,
                shouldLog: false,
                shouldUpdateStatus: options.ref === DefaultReporterBranch,
                isPR: isPR,
                onSubmit: (_report, data) => {
                    let prLinkText = "";
                    if (isPR) {
                        prLinkText = `[#${prNumber}](https://github.com/Equicord/Equicord/pull/${prNumber})`;
                        data.embeds[0].description = `${prLinkText}\n${data.embeds[0].description || ""}`;
                    }
                    reply(msg, data);
                }
            }
        );

        reply(msg, isPR
            ? `Now testing [#${prNumber}](<https://github.com/Equicord/Equicord/pull/${prNumber}>)!`
            : "Now testing!"
        );
    },
});
