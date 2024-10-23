import { AnyGuildChannelWithoutThreads, ChannelTypes } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { silently } from "~/util";

// 0 is text channel
// 15 is forum channel

const channelIcon = {
    [ChannelTypes.GUILD_TEXT]: "<:hash:1298166928438726666>",
    [ChannelTypes.GUILD_FORUM]: "<:forums:1298166907601682464>",
    default: "<:hash:1298166928438726666>",
};

const channelTopicText = {
    [ChannelTypes.GUILD_TEXT]: "Topic for",
    [ChannelTypes.GUILD_FORUM]: "Guidelines for",
    default: "Topic for",
};

defineCommand({
    name: "channeltopic",
    aliases: ["ct", "topic"],
    description: "Show the topic of a channel or guidelines of a forum",
    usage: "[destination channel topic] [custom channel name] | [custom channel topic]",
    guildOnly: true,
    async execute(msg, channelId, ...captionElements) {
        let channel = msg.client.getChannel(msg.channelID) as AnyGuildChannelWithoutThreads;
        let caption = captionElements.join(" ");

        if (channelId) {
            const customChannel = msg.guild.channels.get(channelId.match(/\d+/)?.[0] || "");
            if (customChannel) {
                channel = customChannel;
            } else {
                caption = channelId + " " + caption;
            }
        }

        if (!channel || !channel.name) return;

        const [customChannelName, customTopicName] = caption.split("|").map(s => s.trim());

        const icon = channelIcon[channel.type];
        const topicText = channelTopicText[channel.type];

        let channelName = "";
        let channelTopic = "";
        let content = "";
        let footer = "";

        if (customChannelName || customTopicName) {
            const icon = channelIcon[ChannelTypes.GUILD_TEXT];
            channelName = `${icon}  ${customChannelName}`;
            channelTopic = customTopicName;
        } else if ([ChannelTypes.GUILD_TEXT, ChannelTypes.GUILD_FORUM].includes(channel.type)) {
            if ("topic" in channel && !channel.topic) {
                return msg.createReaction(Emoji.Anger);
            } else if ("topic" in channel) {
                content = `${topicText} ${channel.mention}`;
                channelName = `${icon}  ${channel.name}`;
                channelTopic = channel.topic ?? "";
            }
        } else {
            return msg.createReaction(Emoji.Anger);
        }

        const isReply = !!msg.referencedMessage;
        if (isReply) {
            footer = `Auto-response invoked by ${msg.author.tag}`;
            silently(msg.delete());
        }

        msg.channel.createMessage({
            content,
            embeds: [{
                title: channelName,
                color: 0x2b2d31,
                description: channelTopic,
                footer: { text: footer },
            }],
            messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
            allowedMentions: { repliedUser: isReply }
        });
    }
});
