import { createCanvas, loadImage } from "@napi-rs/canvas";
import * as tf from "@tensorflow/tfjs";
import * as nsfwjs from "nsfwjs";

let modelPromise: Promise<nsfwjs.NSFWJS | null> | null = null;

async function getModel(): Promise<nsfwjs.NSFWJS | null> {
    if (modelPromise === null) {
        modelPromise = tf.ready()
            .then(() => nsfwjs.load())
            .catch(err => {
                modelPromise = null;
                throw err;
            });
    }
    return modelPromise;
}

export interface NSFWResult {
    label: string;
    score: number;
}

const NSFW_LABELS = ["Porn", "Hentai"];

async function bufferToCanvas(buffer: Buffer) {
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas;
}

export async function detectNSFW(image: Buffer): Promise<NSFWResult[]> {
    const model = await getModel();
    if (!model) {
        throw new Error("Failed to load NSFW model");
    }

    const canvas = await bufferToCanvas(image);
    const results = await model.classify(canvas);

    return results.map(r => ({
        label: r.className.toLowerCase(),
        score: r.probability
    }));
}

export function isNSFWLabel(label: string): boolean {
    const normalizedLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    return NSFW_LABELS.includes(normalizedLabel);
}
