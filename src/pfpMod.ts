import { createCanvas, loadImage } from "canvas";
import { User } from "oceanic.js";
import { fetch } from "undici";

import { defineCommand } from "./Command";
import { Emoji } from "./constants";
import { ID_REGEX, reply } from "./util";

async function getCircleCroppedImageData(imgBuf: Buffer) {
    const img = await loadImage(imgBuf);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.arc(img.width / 2, img.height / 2, img.width / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, 0, 0);

    return ctx.getImageData(0, 0, img.width, img.height).data;
}

async function isPfpFullyTransparent(user: User): Promise<[boolean, number]> {
    if (!user.avatar) return [false, 0];

    const avatarBuf = await fetch(user.avatarURL("png", 64).replace("size=64", "size=16")).then(r => r.arrayBuffer());

    // this will make the entire outside (non-visible) area of the pfp transparent, so you can't trick the system
    // by having that area opaque. However, this will also add extra transparency to everyone
    const data = await getCircleCroppedImageData(Buffer.from(avatarBuf));

    const pixelCount = data.length / 4;
    let nonTransparentCount = 0;
    for (let i = 0; i < pixelCount; i++) {
        if (data[i * 4] !== 0) nonTransparentCount++;
    }

    const transparentPercent = (pixelCount - nonTransparentCount) / pixelCount;

    return [transparentPercent > 0.95, transparentPercent];
}

defineCommand({
    name: "pfp-blank",
    async execute(msg, userArg) {
        const uid = userArg?.match(ID_REGEX)?.[1];
        if (!uid) return msg.createReaction(Emoji.QuestionMark);

        const user = await msg.client.rest.users.get(uid).catch(() => null);
        if (!user) return msg.createReaction(Emoji.QuestionMark);

        const [blank, percentage] = await isPfpFullyTransparent(user);
        return reply(msg, blank ? `yop ${percentage}` : "nop");
    }
});

/*
Vaius.once("ready", async () => {
    await sleep(1000);
    const members = await Vaius.guilds.get("1015060230222131221")!.fetchMembers();

    const q = new ConcurrentQueue(20);
    members.forEach(m => q.push(async () => {
        const [blank, percentage] = await isPfpFullyTransparent(m.user);
        if (blank) console.log(m.user.id, percentage);
    }));
});
*/
