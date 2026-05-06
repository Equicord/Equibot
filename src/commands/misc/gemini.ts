import { ContentListUnion, createModelContent, createUserContent, GoogleGenAI } from "@google/genai";
import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";
import { PROD } from "~/constants";
import { stripIndent } from "~/util/text";

const { apiKey, enabled, allowedRoles, bannedRoles } = Config.gemini;

const ai = new GoogleGenAI({ apiKey });

const CLYDE_NAME = "Clyɗe";

async function respondWithClyde(msg: Message<AnyTextableGuildChannel>) {
    const contents: ContentListUnion = [
        createUserContent(stripIndent`
            You are named Clyde - and are currently chatting in a Discord server. Match the tone and style of your responses to that of the user you are responding to, and respond in a concise and helpful manner. If the user is being rude or hostile, you can respond with witty remarks.
            You can't do any moderator actions so don't threaten them.
            Don't use boomer emojis like 😉 please. You can use emojis (sparingly, only one per message please!) but only if they fit the conversation
        `),
        createModelContent("Understood! I will respond as Clyde, matching the user's tone and style while being concise and helpful. I will use emojis appropriately based on the conversation 😼"),
        createUserContent(msg.content)
    ];

    let { text } = await ai.models.generateContent({
        model: "gemma-3-27b-it",
        contents,
        config: {
            maxOutputTokens: 500
        },
    });
    text = text?.trim();

    if (!text) return;

    const webhooks = await msg.client.rest.webhooks.getForChannel(msg.channelID);
    const webhook = webhooks.find(w => w.applicationID === msg.client.application.id) ?? await msg.client.rest.webhooks.create(msg.channelID, { name: "Bonnie and" });

    await webhook.execute({
        username: CLYDE_NAME,
        avatarURL: "https://cdn.discordapp.com/avatars/1081004946872352958/a_6170487d32fdfe9f988720ad80e6ab8c.gif?size=256&animated=true",
        content: `${msg.author.mention} ${text}`,
        allowedMentions: {
            users: [msg.author.id],
            roles: [],
            everyone: false
        },
    });
}

Vaius.on("messageCreate", async msg => {
    if (!PROD || !enabled) return;

    try {
        if (!msg.inCachedGuildChannel()) return;
        if (msg.author.system || msg.author.bot) return;

        const hasAllowedRole = msg.member.roles.some(r => allowedRoles.includes(r));
        const hasBannedRole = msg.member.roles.some(r => bannedRoles.includes(r));
        if (!hasAllowedRole || hasBannedRole) return;

        const isClydeMention = msg.content.includes("<@1081004946872352958>") || (msg.referencedMessage?.webhookID && msg.referencedMessage.author.username === CLYDE_NAME);
        if (isClydeMention) return await respondWithClyde(msg);
    } catch { }
});
