import { readFileSync } from "fs";
import { join } from "path";

import { parse as parseToml } from "toml";
import { array, boolean, check, getDotPath, integer, maxValue, minLength, minValue, number, object, optional, picklist, pipe, safeParse, string, type InferOutput, type ObjectEntries } from "valibot";

const configPath = join(__dirname, "..", "config.toml");

const optionalString = () => optional(string(), "");

const getMissingKeys = (input: Record<string, unknown>, entries: ObjectEntries) =>
    Object.keys(entries).filter(key => input[key] === "" || input[key] === undefined);

// entries are required when the module is enabled, optionalEntries never are
function enabledConfig<const TEntries extends ObjectEntries, const TOptional extends ObjectEntries = {}>(entries: TEntries, optionalEntries?: TOptional) {
    return pipe(
        object({ enabled: boolean(), ...entries, ...(optionalEntries ?? {} as TOptional) }),
        check(
            input => !input.enabled || getMissingKeys(input, entries).length === 0,
            issue => `Missing required values for enabled module: ${getMissingKeys(issue.input as Record<string, unknown>, entries).join(", ")}`
        )
    );
}

const ConfigSchema = pipe(
    object({
        token: pipe(string(), minLength(1)),
        prefixes: array(string()),
        homeGuildId: string(),
        mode: picklist(["development", "production"]),
        rulesChannelId: optionalString(),
        githubLinesEnabled: optional(boolean(), false),

        channels: object({
            autoModLog: optionalString(),
            modLog: optionalString(),
            botAuditLog: optionalString(),
            dev: string(),
            support: string(),
            supportAllowedChannels: optional(array(string()), [])
        }),

        moderation: object({
            nsfwConfidenceThreshold: pipe(number(), minValue(0), maxValue(1)),
            nsfwTimeoutDuration: number(),
            nsfwGifs: optional(boolean(), false),
            invites: optional(boolean(), false),
            inviteAllowedGuilds: optional(array(string()), [])
        }),

        roles: object({
            mod: string(),
            helper: string(),
            donor: string(),
            regular: string(),
            vip: string(),
            fileWhitelist: string(),
            contributor: string(),
            vencordContrib: string(),
            pkgMaintainers: string(),
            distributors: string(),
            artists: string(),
            bugHunter: string(),
            manageableRoles: optional(array(string()), [])
        }),

        gemini: enabledConfig({
            apiKey: optionalString(),
            allowedRoles: optional(array(string()), []),
            bannedRoles: optional(array(string()), [])
        }),

        modmail: enabledConfig({
            channelId: optionalString(),
            logChannelId: optionalString(),
            modRoleId: optionalString(),
            banRoleId: optionalString()
        }),

        httpServer: enabledConfig({
            port: optional(pipe(number(), integer(), minValue(1), maxValue(65535)), 8152),
            domain: optionalString()
        }),

        githubLinking: enabledConfig({
            clientId: optionalString(),
            clientSecret: optionalString(),
            pat: optionalString()
        }),

        reporter: enabledConfig({
            pat: optionalString(),
            webhookSecret: optionalString(),
            logChannelId: optionalString(),
            statusChannelId: optionalString(),
            stableMessageId: optionalString(),
            canaryMessageId: optionalString()
        }),

        updateTracker: enabledConfig({
            api: optionalString(),
            logChannelId: optionalString()
        }, {
            android: optional(boolean(), false),
            appstore: optional(boolean(), false),
            testflight: optional(boolean(), false),
            // without it the tracker only polls
            webhookSecret: optionalString()
        })
    }),
    check(
        input => !(input.githubLinking.enabled || input.reporter.enabled) || !!input.httpServer.domain,
        "httpServer.domain is required when githubLinking or reporter is enabled"
    )
);

function loadConfig(): InferOutput<typeof ConfigSchema> {
    let contents: string;
    try {
        contents = readFileSync(configPath, "utf-8");
    } catch {
        throw new Error(`Failed to read config at ${configPath}. Copy config.example.toml to config.toml and fill it out.`);
    }

    const result = safeParse(ConfigSchema, parseToml(contents));
    if (!result.success) {
        const issues = result.issues
            .map(issue => `${getDotPath(issue) ?? "<root>"}: ${issue.message}`)
            .join("\n");

        throw new Error(`Invalid config at ${configPath}:\n${issues}`);
    }

    return result.output;
}

const Config = loadConfig();

export default Config;
