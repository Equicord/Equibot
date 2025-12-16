import { makeLazy } from "./lazy";

export const getGitRemote = makeLazy(async () => {
    return "https://github.com/Equicord/Equibot";
});

export const getGitCommitHash = makeLazy(async () => {
    return process.env.GIT_COMMIT ?? "unknown";
});
