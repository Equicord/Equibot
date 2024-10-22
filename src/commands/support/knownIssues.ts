import { AnyTextableGuildChannel, Collection, CommandInteraction, EmbedOptions, ForumChannel, Message, PublicThreadChannel, User } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { KNOWN_ISSUES_CHANNEL_ID } from "~/env";
import { silently } from "~/util";

export interface Issue {
    name: string;
    content: string;
    contentId: string;
}

export async function findThreads(
    msgOrInteraction: Message<AnyTextableGuildChannel> | CommandInteraction
): Promise<Collection<string, PublicThreadChannel> | undefined> {
    const guild = msgOrInteraction.guild;
    const forumChannel = guild?.channels.get(KNOWN_ISSUES_CHANNEL_ID) as ForumChannel | undefined;
    if (!forumChannel || forumChannel.type !== 15) return undefined;

    const activeThreads = forumChannel.threads;
    const archivedThreads = await forumChannel.getPublicArchivedThreads();

    archivedThreads.threads.forEach((thread, key) => activeThreads.set(key.toString(), thread));
    return activeThreads;
}

export async function buildIssueStruct(match: any): Promise<Issue> {
    const firstMessage = await match.getMessage(match.id);
    const messageContents = firstMessage ? firstMessage.content : "";
    const messageID = firstMessage ? firstMessage.id : "";

    return {
        name: match.name,
        content: messageContents,
        contentId: messageID,
    };
}

function buildURL(guildID: string, messageID: string): string {
    if (!messageID) { return ""; }
    return `https://discord.com/channels/${guildID}/${messageID}`;
}

export function buildIssueEmbed(issue: Issue, invoker: User, guildID: string): EmbedOptions {
    return {
        title: issue.name,
        color: 0xdd7878,
        description: issue.content,
        url: buildURL(guildID, issue.contentId),
        footer: { text: `Auto-response invoked by ${invoker.tag}` },
    };
}

defineCommand({
    name: "known-issue",
    aliases: ["ki", "i", "issue"],
    description: "Show issues from known-issues channel",
    guildOnly: true,
    usage: "[tag | query]",
    async execute(msg, query) {
        if (!msg.inCachedGuildChannel()) return;

        const threads = await findThreads(msg);

        if (!threads) {
            return msg.channel.createMessage({ content: "that ain't a forum channel ⁉️" });
        }

        const match = (() => {
            if (!query) return;

            const idx = Number(query);
            if (!isNaN(idx)) return threads[idx - 1];

            query = query.toLowerCase();
            return threads?.find(t =>
                t.name.toLowerCase().includes(query)
            );
        })();

        if (match) {
            const isReply = !!msg.referencedMessage;
            if (isReply) silently(msg.delete());

            return msg.channel.createMessage({
                messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
                allowedMentions: { repliedUser: isReply },
                embeds: [
                    buildIssueEmbed(
                        await buildIssueStruct(match), 
                        msg.author, 
                        msg.guild.id
                    )
                ],
            });
        }

        return msg.channel.createMessage({
            content: threads.map((thread, index) =>
                `**${index + 1}.** ${thread.name}`
            ).join("\n") || "I couldn't find any issues :d",
        });
    }
});
