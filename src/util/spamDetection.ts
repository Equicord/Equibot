import { pipeline, type TextClassificationPipeline, type TextClassificationSingle } from "@huggingface/transformers";

let classifier: TextClassificationPipeline | null = null;

async function initClassifier() {
    if (classifier) return;
    classifier = await pipeline("text-classification", "onnx-community/tanaos-spam-detection-v1-ONNX");
}

export interface SpamResult {
    label: string;
    score: number;
    isSpam: boolean;
}

/**
 * Detect if text is spam using the tanaos-spam-detection model
 * Model labels: "ham" (not spam), "spam"
 */
export async function detectSpam(text: string): Promise<SpamResult> {
    if (!classifier) await initClassifier();

    const results = await classifier!(text);
    const result = (Array.isArray(results) ? results[0] : results) as TextClassificationSingle;

    return {
        label: result.label,
        score: result.score,
        isSpam: result.label.toLowerCase() === "spam"
    };
}

/**
 * Check if text is spam with configurable threshold
 */
export async function isSpamText(text: string, threshold = 0.85): Promise<boolean> {
    if (!text || text.trim().length === 0) return false;

    try {
        const result = await detectSpam(text);
        return result.isSpam && result.score >= threshold;
    } catch {
        return false;
    }
}
