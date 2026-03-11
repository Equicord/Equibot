import Config from "~/config";
import { Millis } from "~/constants";
import { sleep } from "~/util/time";
import { checkAndroid } from "./android";
import { checkAppStore } from "./appstore";
import { checkTestFlight } from "./testflight";


export function initUpdateTracker(): void {
    if (!Config.updateTracker.enabled) return;

    (async () => {
        while (true) {
            if (Config.updateTracker.android) await checkAndroid();
            if (Config.updateTracker.appstore) await checkAppStore();
            if (Config.updateTracker.testflight) await checkTestFlight();
            await sleep(30 * Millis.MINUTE);
        }
    })();
}
