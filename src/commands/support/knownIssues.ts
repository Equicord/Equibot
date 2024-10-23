import { AnyTextableChannel, AnyTextableGuildChannel, ChannelTypes, CommandInteraction, ComponentInteraction, EmbedOptions, ForumChannel, Message, PublicThreadChannel, SelectMenuTypes, User } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { KNOWN_ISSUES_CHANNEL_ID } from "~/env";
import { silently } from "~/util";

export interface Issue {
    name: string;
    content: string;
    contentId: string;
}

export async function findThreads(
    msgOrInteraction: Message<AnyTextableGuildChannel> | CommandInteraction | ComponentInteraction<SelectMenuTypes, AnyTextableChannel>
): Promise<PublicThreadChannel[]> {
    const guild = msgOrInteraction.guild;
    const forumChannel = guild?.channels.get(KNOWN_ISSUES_CHANNEL_ID) as ForumChannel | undefined;
    if (!forumChannel || forumChannel.type !== ChannelTypes.GUILD_FORUM) return [];

    const activeThreads = Array.from(forumChannel.threads.values());
    const archivedThreads = await forumChannel.getPublicArchivedThreads();

    return [...activeThreads, ...archivedThreads.threads.values()];
}

export async function buildIssueStruct(match: PublicThreadChannel): Promise<Issue> {
    const firstMessage = await match.getMessage(match.id);
    const messageContents = firstMessage?.content ?? "";
    const messageID = firstMessage.id ?? "";

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
        color: 0xfc5858,
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

        const uniqueThreads = Array.from(new Set(threads.map(thread => thread.name)))
            .map((name, index) => {
                const thread = threads.find(t => t.name === name);
                return `**${index + 1}.** ${thread?.name}`;
            });

        return msg.channel.createMessage({
            content: uniqueThreads.join("\n") || "I couldn't find any issues :d",
        });
    }
});
