import { Millis } from "~/constants";

const dailyCallbacks = new Set<Function>();

const millisToNextFullDay = () => Millis.DAY - (Date.now() % Millis.DAY);

function runDailyCallbacks() {
    for (const callback of dailyCallbacks) {
        callback();
    }

    setTimeout(runDailyCallbacks, millisToNextFullDay());
}

setTimeout(runDailyCallbacks, millisToNextFullDay());

export const daily = (callback: Function) => {
    dailyCallbacks.add(callback);
    return () => dailyCallbacks.delete(callback);
};
