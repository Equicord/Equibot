import dotenv from "dotenv";
import { array, minLength, number, object, optional, picklist, pipe, string, transform } from "valibot";

import { mustParse } from "~/util/validation";

const { error } = dotenv.config({ override: true });
if (error)
    throw error;

const configSchema = object({
    PREFIXES: pipe(
        string(),
        transform(s => s.split(/ +/).filter(Boolean)),
        array(string()),
        minLength(1)
    ),
    DISCORD_TOKEN: string(),

    NODE_ENV: optional(picklist(["development", "production"])),

    GUILD_ID: string(),

    DEV_CHANNEL_ID: string(),
    SUPPORT_CHANNEL_ID: string(),
    BOT_CHANNEL_ID: string(),

    MOD_PERMS_ROLE_ID: string(),
    MOD_LOG_CHANNEL_ID: string(),

    HTTP_SERVER_LISTEN_PORT: pipe(
        string(),
        transform(Number),
        number()
    ),
    HTTP_DOMAIN: string(),

    GITHUB_WORKFLOW_DISPATCH_PAT: string(),

    REPORTER_WEBHOOK_SECRET: string(),
});

const parsed = mustParse("Invalid environment variables", configSchema, process.env);

export const {
    PREFIXES,
    DISCORD_TOKEN,
    NODE_ENV,
    GUILD_ID,

    DEV_CHANNEL_ID,
    BOT_CHANNEL_ID,
    MOD_LOG_CHANNEL_ID,
    MOD_PERMS_ROLE_ID,
    SUPPORT_CHANNEL_ID,

    HTTP_SERVER_LISTEN_PORT,
    HTTP_DOMAIN,

    GITHUB_WORKFLOW_DISPATCH_PAT,

    REPORTER_WEBHOOK_SECRET,
} = parsed;
