import { createWriteStream } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";

import { Millis } from "~/constants";

import { ttlLazy } from "./lazy";
import { sleep } from "./time";

type Url = string | URL;

/**
 * @param options.retryCount Number of times to retry on network failure. Default is 3.
 * @param options.retryDelayMs Delay between retries in milliseconds. Default is 1000.
 */
export async function doFetch(
    url: Url,
    init?: RequestInit,
    options: { retryCount?: number, retryDelayMs?: number; } = {}
): Promise<Response> {
    const { retryCount = 3, retryDelayMs = 1000 } = options;

    for (let attempt = 0; ; attempt++) {
        try {
            var res = await fetch(url, init);
            break;
        } catch (err) {
            if (attempt >= retryCount) throw err;

            await sleep(retryDelayMs);
        }
    }

    if (res.ok)
        return res;

    let message = `${init?.method ?? "GET"} ${url}: ${res.status} ${res.statusText}`;
    try {
        const reason = await res.text();
        message += `\n${reason.slice(0, 500)}`;
    } catch { }

    throw new Error(message);
}

export async function fetchBuffer(url: Url, init?: RequestInit) {
    const res = await doFetch(url, init);
    return Buffer.from(await res.arrayBuffer());
}

export async function fetchJson<T = any>(url: Url, options?: RequestInit) {
    const res = await doFetch(url, options);
    return res.json() as Promise<T>;
}

export async function downloadToFile(url: Url, path: string, init?: RequestInit) {
    const res = await doFetch(url, init);
    if (!res.body) throw new Error(`Download ${url}: response body is empty`);

    const body = Readable.fromWeb(res.body);
    await finished(body.pipe(createWriteStream(path)));
}

export function makeCachedJsonFetch<T>(url: string, ttl = 5 * Millis.MINUTE) {
    return ttlLazy(
        () => doFetch(url).then(res => res.json() as Promise<T>),
        ttl
    );
}

export async function fetchJsons(urls: string[]) {
    const responses = await Promise.all(urls.map(url => fetch(url)));

    responses.forEach((res, i) => {
        if (!res.ok) throw new Error(`Failed to fetch URL at index ${i}: ${urls[i]}`);
    });
    const jsons = await Promise.all(responses.map(res => res.json()));

    return jsons;
}
