
import { makeLazy } from "./lazy";

export const getGitRemote = makeLazy(async () => {
    return "https://github.com/Equicord/Equibot";
});

export const getGitCommitHash = makeLazy(async () => {
    const { stdout } = await execFileP("git", ["rev-parse", "HEAD"]);
    return stdout.trim();
});
