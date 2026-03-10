
import fs from "fs";

export function readVersion(file: string): number {
    try {
        return parseInt(fs.readFileSync(file, "utf-8").trim(), 10) || 0;
    } catch {
        return 0;
    }
}

export function writeVersion(file: string, version: number): void {
    fs.writeFileSync(file, version.toString(), "utf-8");
}
