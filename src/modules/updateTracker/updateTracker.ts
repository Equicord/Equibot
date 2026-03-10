import Config from "~/config";
import { Millis } from "~/constants";
import { sleep } from "~/util/time";
import { checkAndroid } from "./android";
import { checkIos } from "./ios";


export function initUpdateTracker(): void {
    if (!Config.updateTracker.enabled) return;

    (async () => {
        while (true) {
            if (Config.updateTracker.android) await checkAndroid();
            if (Config.updateTracker.ios) await checkIos();
            await sleep(30 * Millis.MINUTE);
        }
    })();
}
