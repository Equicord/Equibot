import Config from "~/config";
import { Millis } from "~/constants";
import { sleep } from "~/util/time";
import { checkAndroid } from "./android";
import { checkIos } from "./ios";


export function initUpdateTracker(): void {
    const c = Config.updateTracker;
    if (!c.enabled) return;

    (async () => {
        while (true) {
            if (c.android) await checkAndroid();
            if (c.ios) await checkIos();
            await sleep(30 * Millis.MINUTE);
        }
    })();
}
