import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export interface DB {
    stickyroles: {
        id: string;
        roleids: string;
    };

    linkedgithubs: {
        githubid: string;
        discordid: string;
    };
}

const pool = new Pool({
    connectionString: process.env.POSTGRES_URI
});

const dialect = new PostgresDialect({
    pool
});

export const db = new Kysely<DB>({
    dialect
});

export const enum ExpressionType {
    EMOJI = "emoji",
    STICKER = "sticker",
}

export const enum ExpressionUsageType {
    MESSAGE = "message",
    REACTION = "reaction",
}

export const enum ExpressionFormatType {
    PNG = "png",
    APNG = "apng",
    GIF = "gif",
    LOTTIE = "lottie"
}
