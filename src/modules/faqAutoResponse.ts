import { dot, FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";
import { Message } from "oceanic.js";

import { Vaius } from "~/Client";
import { buildFaqEmbed, fetchFaq } from "~/commands/support/faq";
import Config from "~/config";
import { SUPPORT_ALLOWED_CHANNELS } from "~/constants";
import { reply } from "~/util/discord";
import { silently } from "~/util/functions";
import { TTLMap } from "~/util/TTLMap";

interface FaqEntry {
    question: string;
    answer: string;
    tags: string[];
    embedding: number[];
}

const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

let extractor: FeatureExtractionPipeline | null = null;
const faqEmbeddings: FaqEntry[] = [];
let cooldownMap: TTLMap<string, boolean>;

export async function initFaqAutoResponse() {
    if (!Config.faqAutoResponse.enabled) {
        console.log("[FAQ Auto-Response] Disabled in config");
        return;
    }

    cooldownMap = new TTLMap<string, boolean>(Config.faqAutoResponse.cooldownSeconds * 1000);

    console.log("[FAQ Auto-Response] Loading embedding model...");

    try {

        const pipelineOptions: any = {
            progress_callback: (progress: any) => {
                if ((progress as any).status === "progress") {
                    console.log(`[FAQ Auto-Response] Download progress: ${Math.round((progress as any).progress)}%`);
                }
            }
        };

        extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", pipelineOptions) as any as FeatureExtractionPipeline;

        console.log("[FAQ Auto-Response] Model loaded, fetching FAQ entries...");

        const faqData = await fetchFaq();

        if (!faqData || faqData.length === 0) {
            console.error("[FAQ Auto-Response] No FAQ entries found");
            return;
        }

        console.log("[FAQ Auto-Response] Computing FAQ embeddings...");

        for (const faq of faqData) {
            const embeddingText = `${faq.question}\n${faq.tags.join(", ")}`;
            const output = await extractor(embeddingText, { normalize: true, pooling: "cls" });
            const embedding = Array.from(output.data as Float32Array);

            faqEmbeddings.push({
                question: faq.question,
                answer: faq.answer,
                tags: faq.tags,
                embedding
            });
        }

        console.log(`[FAQ Auto-Response] Computed embeddings for ${faqEmbeddings.length} FAQ entries`);

        Vaius.on("messageCreate", handleFaqMessage);

        console.log("[FAQ Auto-Response] Ready!");
    } catch (error) {
        console.error("[FAQ Auto-Response] Failed to initialize:", error);
    }
}

async function handleFaqMessage(msg: Message) {
    if (!Config.faqAutoResponse.enabled || !extractor) return;
    if (msg.author.bot) return;
    if (!SUPPORT_ALLOWED_CHANNELS.includes(msg.channelID)) return;
    if (msg.content.length < Config.faqAutoResponse.minMessageLength) return;
    if (cooldownMap.has(msg.author.id)) return;
    if (msg.member?.roles.includes(Config.roles.noSupport)) return;
    if (msg.member?.roles?.includes(Config.roles.mod)) return;

    try {
        const queryText = QUERY_PREFIX + msg.content;
        const output = await extractor(queryText, { normalize: true, pooling: "cls" });
        const messageEmbedding = Array.from(output.data as Float32Array);

        let bestMatch: FaqEntry | null = null;
        let bestSimilarity = 0;

        for (const faq of faqEmbeddings) {
            const similarity = dot(messageEmbedding, faq.embedding);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = faq;
            }
        }

        if (bestMatch && bestSimilarity >= Config.faqAutoResponse.similarityThreshold) {
            const embed = buildFaqEmbed(bestMatch, msg.author);
            embed.footer = { text: `Auto-matched FAQ (${Math.round(bestSimilarity * 100)}% similarity)` };

            await reply(msg, { embeds: [embed] });

            cooldownMap.set(msg.author.id, true);
        }
    } catch (error) {
        silently(Promise.reject(error));
    }
}
