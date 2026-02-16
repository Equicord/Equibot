import { createCanvas, loadImage } from "@napi-rs/canvas";
import * as tf from "@tensorflow/tfjs";
import * as nsfwjs from "nsfwjs";

let modelPromise: Promise<nsfwjs.NSFWJS | null> | null = null;

function getModel(): Promise<nsfwjs.NSFWJS | null> {
    if (modelPromise === null) {
        modelPromise = nsfwjs.load();
    }
    return modelPromise;
}

export interface NSFWResult {
    label: string;
    score: number;
}

const NSFW_LABELS = ["Porn", "Hentai"];

async function bufferToTensor(buffer: Buffer): Promise<tf.Tensor3D> {
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const { data, width, height } = imageData;

    const pixels = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        pixels[i * 3] = data[i * 4];
        pixels[i * 3 + 1] = data[i * 4 + 1];
        pixels[i * 3 + 2] = data[i * 4 + 2];
    }

    return tf.tensor3d(pixels, [height, width, 3], "int32");
}

export async function detectNSFW(image: Buffer): Promise<NSFWResult[]> {
    const model = await getModel();
    if (!model) {
        throw new Error("Failed to load NSFW model");
    }

    const tensor = await bufferToTensor(image);
    const results = await model.classify(tensor);
    tensor.dispose();

    return results.map(r => ({
        label: r.className.toLowerCase(),
        score: r.probability
    }));
}

export function isNSFWLabel(label: string): boolean {
    const normalizedLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    return NSFW_LABELS.includes(normalizedLabel);
}
