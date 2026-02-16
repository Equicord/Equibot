import { pipeline, type ImageClassificationPipeline } from "@huggingface/transformers";

let classifierPromise: Promise<ImageClassificationPipeline> | null = null;

function getClassifier(): Promise<ImageClassificationPipeline> {
    if (classifierPromise === null) {
        classifierPromise = pipeline("image-classification", "AdamCodd/vit-base-nsfw-detector");
    }
    return classifierPromise;
}

export interface NSFWResult {
    label: string;
    score: number;
}

export async function detectNSFW(image: Buffer): Promise<NSFWResult[]> {
    const classifier = await getClassifier();
    const results = await classifier(image);

    const finalResults = Array.isArray(results) ? results : [results];

    return finalResults.map(r => ({ label: r.label, score: r.score }));
}
