
import { makeLazy } from "./lazy";

export const getGitRemote = makeLazy(async () => {
    return "https://github.com/Equicord/Equibot";
});
