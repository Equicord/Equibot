import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { DATA_DIR } from "~/constants";
import { run } from "~/util/functions";

const StateFile = join(DATA_DIR, "botState.json");

interface BotState {
    discordTracker?: {
        stableHash?: string;
        canaryHash?: string;
    },
}

const savedState = run(() => {
    try {
        return JSON.parse(readFileSync(StateFile, "utf8"));
    } catch {
        return {};
    }
});
const state = { ...savedState };

function saveSettings() {
    writeFileSync(StateFile, JSON.stringify(state, null, 4));
}

function makeProxy(obj: Object) {
    const proxyHandler = {} as ProxyHandler<any>;
    proxyHandler.get = (target, p, receiver) => {
        const res = Reflect.get(target, p, receiver);

        if (typeof res === "object" && res !== null && !Array.isArray(res))
            return new Proxy(res, proxyHandler);

        return res;
    };

    for (const operation of ["set", "defineProperty", "deleteProperty"]) {
        proxyHandler[operation] = (...args: any[]) => {
            const res = Reflect[operation](...args);
            saveSettings();
            return res;
        };
    }

    return new Proxy(obj, proxyHandler);
}

export const BotState = makeProxy(state) as BotState;
