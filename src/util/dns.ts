import { doFetch } from "./fetch";

const CLOUDFLARE_FAMILY_DNS = "https://family.cloudflare-dns.com/dns-query";

export interface DNSResult {
    blocked: boolean;
    domain: string;
}

/**
 * Check if a domain is blocked by Cloudflare Family DNS
 * Family DNS blocks malware and adult content, returning 0.0.0.0 for blocked domains
 */
export async function checkDomainBlocked(domain: string): Promise<DNSResult> {
    const url = `${CLOUDFLARE_FAMILY_DNS}?name=${encodeURIComponent(domain)}&type=A`;

    const res = await doFetch(url, {
        headers: {
            Accept: "application/dns-json"
        }
    });

    const data = await res.json() as { Answer?: { data: string }[] };

    // If no Answer array or empty, domain doesn't resolve (could be blocked or non-existent)
    if (!data.Answer || data.Answer.length === 0) {
        return { blocked: false, domain };
    }

    // Cloudflare Family DNS returns 0.0.0.0 for blocked domains
    const isBlocked = data.Answer.some(a => a.data === "0.0.0.0");

    return { blocked: isBlocked, domain };
}

const URL_REGEX = /https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;

export function extractUrls(text: string): string[] {
    return [...text.matchAll(URL_REGEX)].map(m => m[0]);
}

export function extractDomains(text: string): string[] {
    const urls = extractUrls(text);
    return [...new Set(urls.map(url => {
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    }).filter((d): d is string => d !== null))];
}
