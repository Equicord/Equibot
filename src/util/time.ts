import { Millis } from "~/constants";

export function sleep(ms: number) {
    return new Promise<void>(r => setTimeout(r, ms));
}

export function until(ms: number) {
    return new Date(Date.now() + ms).toISOString();
}

export function formatDuration(ms: number): string {
    const hours = ms / Millis.HOUR;
    if (hours >= 1 && hours % 1 === 0) {
        return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    const minutes = ms / Millis.MINUTE;
    if (minutes >= 1 && minutes % 1 === 0) {
        return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    }
    return `${ms}ms`;
}
