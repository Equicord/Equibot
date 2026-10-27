import { createHash } from "crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { ApplicationCommandOptionTypes, MessageFlags } from "oceanic.js";

import { ZWSP } from "~/constants";
import { ChatInputCommandOptions, CommandInteractionHandler, registerChatInputCommand } from "~/SlashCommands";
import { run } from "~/util/functions";

import { buffer } from "stream/consumers";
import Config from "~/config";
import { OwnerId } from "~/owner";
import { atomicWriteFileSync } from "~/util/atomicWriteFile";
import { spawnP } from "~/util/childProcess";
import { getHomeGuild } from "~/util/discord";
import { lookupKlipyURL, lookupTenorURL } from "~/util/gifs";
import { logBadgeAction } from "~/util/logAction";
import { CommandAttachmentOption, CommandBooleanOption, CommandIntegerOption, CommandStringOption, CommandUserOption } from "~components";
import { PROD } from "../../constants";
import { doFetch } from "../../util/fetch";

const BasePath = "/app/badges";
const BadgeJson = `${BasePath}/badges.json`;
const badgesForUser = (userId: string) => `${BasePath}/badges/${userId}`;

interface BadgeInfo {
    tooltip: string;
    badge: string;
}

const BadgeData: Record<string, Array<BadgeInfo>> = run(() => {
    try {
        return JSON.parse(readFileSync(BadgeJson, "utf-8"));
    } catch {
        return {};
    }
});

const saveBadges = () => atomicWriteFileSync(BadgeJson, JSON.stringify(BadgeData));

const COMMAND_NAME = PROD ? "badge" : "devbadge";

const DefaultBadgeUrl = "https://badge.equicord.org/donor.webp";
const DefaultBadgeTooltip = "Equicord Donor";
const TranslatorBadgeUrl = "https://badge.equicord.org/translator.png";
const TranslatorBadgeTooltip = "Equicord Translator";

async function optimizeImage(imgData: Buffer, ext: string) {
    const { child, promise } = ext === "gif"
        ? spawnP("gifsicle", ["-O3", "--colors", "256", "--resize", "128x128"], {})
        : spawnP("convert", ["-", "-background", "none", "-resize", "128x128", "-quality", "75", "WEBP:-"], {});

    // the process may exit before consuming all of stdin
    child.stdin!.on("error", () => { });
    child.stdin!.end(imgData);

    const stdout = buffer(child.stdout!);
    const stderr = buffer(child.stderr!);

    let res: Buffer;
    try {
        [res] = await Promise.all([stdout, promise]);
    } catch (err) {
        console.error("Failed to optimize badge image", err, (await stderr).toString());
        res = Buffer.alloc(0);
    }

    // a failed run produces empty output, which must not be mistaken for a smaller image
    const useOptimized = res.byteLength > 0 && res.byteLength < imgData.byteLength;

    return [
        useOptimized ? res : imgData,
        useOptimized ? (ext === "gif" ? "gif" : "webp") : ext,
        imgData.byteLength,
        res.byteLength
    ] as const;
}

async function normaliseUrl(rawUrl: string) {
    const url = new URL(rawUrl);
    if (url.host === "tenor.com") return lookupTenorURL(url);
    if (url.host === "klipy.com") return lookupKlipyURL(url);
    if (url.host !== "cdn.discordapp.com" || url.pathname.includes("/attachments/")) return rawUrl;

    url.searchParams.set("size", "128");

    return url.toString();
}

const handler: CommandInteractionHandler = {
    homeGuildOnly: true,
    async handle(i) {
        const [subCommand] = i.data.options.getSubCommand(true);

        if (i.user.id !== OwnerId) {
            if (!i.member?.roles.includes(Config.roles.mod))
                return;
        }

        const { data } = i;
        const guild = i.guild ?? getHomeGuild();

        if (subCommand === "copy") {
            const oldUser = data.options.getUser("old-user", true);
            const newUser = data.options.getUser("new-user", true);

            if (!BadgeData[oldUser.id]?.length)
                return i.createMessage({
                    content: "Badge not found",
                    flags: MessageFlags.EPHEMERAL
                });

            cpSync(badgesForUser(oldUser.id), badgesForUser(newUser.id), { recursive: true });

            BadgeData[newUser.id] = BadgeData[oldUser.id].map(b => {
                const badge = {
                    ...b,
                    badge: b.badge.replace(oldUser.id, newUser.id)
                };

                logBadgeAction("Copied", oldUser, badge, badge, newUser);

                return badge;
            });
            saveBadges();

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        if (subCommand === "default") {
            const user = data.options.getUser("user", true);

            i.defer(MessageFlags.EPHEMERAL);

            const res = await doFetch(DefaultBadgeUrl);
            const imgData = Buffer.from(await res.arrayBuffer());

            const hash = createHash("sha1").update(imgData).digest("hex");
            const fileName = `${hash}.webp`;

            BadgeData[user.id] ??= [];

            const newBadgeData = {
                tooltip: DefaultBadgeTooltip,
                badge: `https://badge.equicord.org/badges/${user.id}/${fileName}`
            };

            BadgeData[user.id].push(newBadgeData);
            logBadgeAction("Added", user, newBadgeData);

            mkdirSync(badgesForUser(user.id), { recursive: true });
            writeFileSync(`${badgesForUser(user.id)}/${fileName}`, imgData);

            saveBadges();

            if (guild) {
                const member = await guild.getMember(user.id).catch(() => null);
                if (member && !member.roles.includes(Config.roles.donor))
                    await member.addRole(Config.roles.donor, "Donor badge has been added");
            }

            return i.createFollowup({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        if (subCommand === "translator") {
            const user = data.options.getUser("user", true);

            i.defer(MessageFlags.EPHEMERAL);

            const res = await doFetch(TranslatorBadgeUrl);
            const imgData = Buffer.from(await res.arrayBuffer());

            const hash = createHash("sha1").update(imgData).digest("hex");
            const fileName = `${hash}.webp`;

            BadgeData[user.id] ??= [];

            const newBadgeData = {
                tooltip: TranslatorBadgeTooltip,
                badge: `https://badge.equicord.org/badges/${user.id}/${fileName}`
            };

            BadgeData[user.id].push(newBadgeData);
            logBadgeAction("Added", user, newBadgeData);

            mkdirSync(badgesForUser(user.id), { recursive: true });
            writeFileSync(`${badgesForUser(user.id)}/${fileName}`, imgData);

            saveBadges();

            return i.createFollowup({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        if (subCommand === "move") {
            const oldUser = data.options.getUser("old-user", true);
            const newUser = data.options.getUser("new-user", true);

            if (oldUser.id === newUser.id)
                return i.createMessage({
                    content: "Cannot move badges to the same user",
                    flags: MessageFlags.EPHEMERAL
                });

            if (!BadgeData[oldUser.id]?.length)
                return i.createMessage({
                    content: "Badge not found",
                    flags: MessageFlags.EPHEMERAL
                });

            const oldFolder = badgesForUser(oldUser.id);
            const newFolder = badgesForUser(newUser.id);

            if (BadgeData[newUser.id]) {
                mkdirSync(newFolder, { recursive: true });

                let files: string[] = [];
                try {
                    files = readdirSync(oldFolder);
                } catch {
                    files = [];
                }

                for (const file of files) {
                    const oldPath = `${oldFolder}/${file}`;
                    const newPath = `${newFolder}/${file}`;
                    renameSync(oldPath, newPath);
                }
                rmSync(oldFolder, { recursive: true, force: true });
            } else {
                renameSync(oldFolder, newFolder);
                BadgeData[newUser.id] = [];
            }

            const oldBadgeData = BadgeData[oldUser.id];
            oldBadgeData.forEach(b => {
                const badgeUrl = b.badge.replace(oldUser.id, newUser.id);
                const badge = {
                    ...b,
                    badge: badgeUrl
                };

                logBadgeAction("Moved", oldUser, badge, badge, newUser);

                b.badge = badgeUrl;
            });
            BadgeData[newUser.id].push(...oldBadgeData);

            delete BadgeData[oldUser.id];
            saveBadges();

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        const user = data.options.getUser("user", true);
        const existingBadgeIndex = data.options.getInteger("badge");

        if (subCommand === "remove-all") {
            if (!BadgeData[user.id]?.length)
                return i.createMessage({
                    content: "No badges found",
                    flags: MessageFlags.EPHEMERAL
                });

            BadgeData[user.id].map(badge => {
                const fileName = new URL(badge.badge).pathname.split("/").pop()!;
                const contents = readFileSync(`${badgesForUser(user.id)}/${fileName}`);
                const file = {
                    name: fileName,
                    contents,
                };
                logBadgeAction("Removed", user, badge, undefined, undefined, file);
            });

            rmSync(badgesForUser(user.id), { recursive: true, force: true });

            delete BadgeData[user.id];

            saveBadges();

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        if (subCommand === "remove") {
            const existingBadge = BadgeData[user.id]?.[existingBadgeIndex!];
            if (!existingBadge) return i.createMessage({
                content: "Badge not found",
                flags: MessageFlags.EPHEMERAL
            });

            const fileName = new URL(existingBadge.badge).pathname.split("/").pop()!;
            const contents = readFileSync(`${badgesForUser(user.id)}/${fileName}`);
            rmSync(`${badgesForUser(user.id)}/${fileName}`, { force: true });

            BadgeData[user.id].splice(existingBadgeIndex!, 1);
            if (BadgeData[user.id].length === 0)
                delete BadgeData[user.id];

            const file = {
                name: fileName,
                contents,
            };

            logBadgeAction("Removed", user, existingBadge, undefined, undefined, file);

            saveBadges();

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL,
            });
        }

        let tooltip = data.options.getString("tooltip");
        const image = data.options.getAttachment("image");
        const imageUrl = data.options.getString("image-url");

        let url = image?.url ?? imageUrl;
        if (url) url = await normaliseUrl(url);

        if (!url || !tooltip) {
            const existing = existingBadgeIndex != null && BadgeData[user.id]?.[existingBadgeIndex];
            if (!existing || (!url && !tooltip))
                return i.createMessage({
                    content: "bruh",
                    flags: MessageFlags.EPHEMERAL
                });

            url ??= existing.badge;
            tooltip ??= existing.tooltip;
        }

        const optimize = data.options.getBoolean("optimize") ?? !url.includes(".svg");

        i.defer(MessageFlags.EPHEMERAL);

        let imgData: Buffer;
        let ext: string;
        let footer = "";

        {
            const res = await doFetch(url);
            imgData = Buffer.from(await res.arrayBuffer());

            const { pathname } = new URL(url);
            const lastSegment = pathname.split("/").pop() ?? "";
            const dotIndex = lastSegment.lastIndexOf(".");

            if (dotIndex !== -1 && dotIndex < lastSegment.length - 1) {
                ext = lastSegment.slice(dotIndex + 1);
            } else {
                const contentType = res.headers.get("content-type") ?? "";
                const mimeToExt: Record<string, string> = {
                    "image/png": "png",
                    "image/jpeg": "jpg",
                    "image/gif": "gif",
                    "image/webp": "webp",
                    "image/svg+xml": "svg",
                    "image/apng": "apng"
                };
                ext = mimeToExt[contentType.split(";")[0]] ?? "png";
            }
        }

        if (optimize) {
            let sizes: [number, number];
            ([imgData, ext, ...sizes] = await optimizeImage(imgData, ext));

            footer = sizes[1] === 0
                ? "Optimization failed, kept original image\n"
                : `${(sizes[0] / 1024).toFixed(2)}k -> ${(sizes[1] / 1024).toFixed(2)}k\n`;
        }

        const hash = createHash("sha1").update(imgData).digest("hex");

        BadgeData[user.id] ??= [];
        const index = existingBadgeIndex ?? BadgeData[user.id].length;
        const fileName = `${hash}.${ext}`;

        const newBadgeData: BadgeInfo = {
            tooltip: tooltip,
            badge: `https://badge.equicord.org/badges/${user.id}/${fileName}`,
        };

        const before = data.options.getInteger("before");
        if (before != null) {
            BadgeData[user.id].splice(before, 0, newBadgeData);
        } else {
            const existingBadge = BadgeData[user.id][index];
            if (existingBadge) {
                const fileName = new URL(existingBadge.badge).pathname.split("/").pop()!;
                const contents = readFileSync(`${badgesForUser(user.id)}/${fileName}`);
                const file = {
                    name: fileName,
                    contents,
                };
                logBadgeAction("Edited", user, existingBadge, newBadgeData, undefined, file);
                rmSync(`${badgesForUser(user.id)}/${fileName}`, { force: true });
            }

            BadgeData[user.id][index] = newBadgeData;
        }

        if (subCommand === "add") logBadgeAction("Added", user, newBadgeData);

        mkdirSync(badgesForUser(user.id), { recursive: true });
        writeFileSync(`${badgesForUser(user.id)}/${fileName}`, imgData);

        saveBadges();

        if (guild) {
            const member = await guild.getMember(user.id).catch(() => null);
            if (member && !member.roles.includes(Config.roles.donor))
                await member.addRole(Config.roles.donor, "Donor badge has been added"); {
            }
        }

        i.createFollowup({
            content: `Done!${footer && "\n\n-# " + footer}`,
            flags: MessageFlags.EPHEMERAL
        });
    },
    autoComplete(i) {
        const user = i.data.options.getUserOption("user")!;
        const oldBadgeInput = i.data.options.getOptions().find(opt => opt.name === "badge" || opt.name === "before")!.value as string;
        const existingBadges = BadgeData[user.value];

        return i.result(
            existingBadges
                ?.map((b, i) => ({
                    name: `${i} - ${b.tooltip === ZWSP ? "<ZWSP>" : b.tooltip}`,
                    value: String(i)
                }))
                .filter(b => b.name.toLowerCase().includes(oldBadgeInput.toLowerCase()))
                .slice(0, 25)
            ?? []
        );
    }
};

function registerCommand(data: ChatInputCommandOptions) {
    registerChatInputCommand({
        ...data,
        defaultMemberPermissions: "0",
    }, handler);
}

const RequiredUser = <CommandUserOption name="user" required />;
const NewUser = <CommandUserOption name="new-user" required />;
const OldUser = <CommandUserOption name="old-user" required />;
const Optimize = <CommandBooleanOption name="optimize" />;
const Image = <CommandAttachmentOption name="image" />;
const ImageUrl = <CommandStringOption name="image-url" />;
const makeTooltip = (required: boolean) => <CommandStringOption name="tooltip" required={required} />;
const makeExistingBadge = (name: string, required = true) => <CommandIntegerOption name={name} required={required} autocomplete />;

registerCommand({
    name: COMMAND_NAME,
    options: [
        {
            name: "add",
            description: "Add a new badge",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [
                RequiredUser,
                makeTooltip(true),
                ImageUrl,
                Image,
                makeExistingBadge("before", false),
                Optimize
            ]
        },
        {
            name: "edit",
            description: "Edit an existing badge",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [
                RequiredUser,
                makeExistingBadge("badge"),
                makeTooltip(false),
                ImageUrl,
                Image,
                Optimize
            ]
        },
        {
            name: "remove",
            description: "Remove an existing badge",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [RequiredUser, makeExistingBadge("badge")]
        },
        {
            name: "remove-all",
            description: "Remove all badges from a user",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [RequiredUser]
        },
        {
            name: "move",
            description: "Move a badge from one user to another",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [OldUser, NewUser]
        },
        {
            name: "copy",
            description: "Copy a badge from one user to another",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [OldUser, NewUser]
        },
        {
            name: "default",
            description: "Give a user the default donor badge",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [RequiredUser]
        },
        {
            name: "translator",
            description: "Give a user the translator badge",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [RequiredUser]
        }
    ]
});
