import { pipeline, type ImageClassificationPipeline } from "@huggingface/transformers";

let classifier: ImageClassificationPipeline | null = null;

async function initClassifier() {
    if (classifier) return;
    classifier = await pipeline("image-classification", "AdamCodd/vit-base-nsfw-detector");
}

export interface NSFWResult {
    label: string;
    score: number;
}

export async function detectNSFW(image: Buffer): Promise<NSFWResult[]> {
    if (!classifier) await initClassifier();

    const results = await classifier!(image);
    return results.map(r => ({ label: r.label, score: r.score }));
}
