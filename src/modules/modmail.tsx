import { ActivityTypes, AnyTextableGuildChannel, ButtonStyles, ChannelTypes, CommandInteraction, ComponentInteraction, ComponentTypes, InteractionTypes, MessageFlags, ModalSubmitInteraction, SeparatorSpacingSize, TextChannel, TextInputStyles } from "oceanic.js";

import { db } from "~/db";
import { handleComponentInteraction, handleInteraction, registerChatInputCommand } from "~/SlashCommands";
import { kebabToTitle, stripIndent } from "~/util/text";

import Config from "~/config";
import { MANAGEABLE_ROLES, PROD } from "~/constants";
import { sendDm } from "~/util/discord";
import { fetchBuffer } from "~/util/fetch";
import { isNonNullish } from "~/util/guards";
import { ActionRow, Button, ComponentMessage, Container, File, FileUpload, MediaGallery, MediaGalleryItem, ModalLabel, Separator, StringOption, StringSelect, TextDisplay, TextInput } from "~components";
import { Vaius } from "../Client";
import { defineCommand } from "../Commands";

const { banRoleId, channelId, enabled, logChannelId, modRoleId } = Config.modmail;
const commandName = PROD ? "modmail" : "devmodmail";

const enum Ids {
    OPEN_TICKET = "modmail:open-ticket",
    OPEN_SUBMIT = "modmail:open-submit",
    CLOSE = "modmail:close:",
    CLOSE_BAN = "modmail:close-ban:",
    MANAGE_ROLES = "modmail:manage-roles:",
    ADD_ROLE = "modmail:add-role:",
    REMOVE_ROLE = "modmail:remove-role:"
}

const Reasons = {
    moderation: ["moderation", "I need to talk to a moderator", "Please provide any relevant details or supporting media."],
    report: ["report", "I need to report something in this server", "Please describe what happened and attach any relevant evidence."],
    other: ["ticket", "Something else related to this server", "Please describe how we can help."],
} as const;

type TicketReason = keyof typeof Reasons;
type GuildInteraction = ComponentInteraction<ComponentTypes.BUTTON, AnyTextableGuildChannel> | CommandInteraction<AnyTextableGuildChannel>;

let ticketsTableReady: Promise<void> | undefined;

function ensureTicketsTable() {
    return ticketsTableReady ??= db.schema
        .createTable("tickets")
        .ifNotExists()
        .addColumn("id", "serial", column => column.primaryKey())
        .addColumn("userId", "varchar(20)", column => column.notNull().unique())
        .addColumn("channelId", "varchar(20)", column => column.notNull())
        .execute()
        .then(() => undefined);
}

function getThreadParent() {
    const channel = Vaius.getChannel(channelId);
    if (!channel) throw new Error("Modmail parent channel is not available");

    return channel as TextChannel;
}

function log(content: string) {
    return Vaius.rest.channels.createMessage(logChannelId, { content });
}

async function createTicketModal(interaction: GuildInteraction) {
    if (interaction.member.roles.includes(banRoleId)) {
        return interaction.createMessage({
            content: "You are banned from opening tickets.",
            flags: MessageFlags.EPHEMERAL
        });
    }

    return interaction.createModal({
        title: "Open a Ticket",
        customID: Ids.OPEN_SUBMIT,
        components: <>
            <TextDisplay>
                {stripIndent`
                    Tickets are for matters in this server that need moderator attention.
                    For Equicord support or questions, use <#${Config.channels.support}>.
                    We cannot moderate DMs or events outside this server.
                `}
            </TextDisplay>
            <ModalLabel label="Why are you opening a ticket?">
                <StringSelect customID="reason" placeholder="Choose a reason" required>
                    {Object.entries(Reasons).map(([value, [, label]]) => <StringOption label={label} value={value} />)}
                </StringSelect>
            </ModalLabel>
            <ModalLabel label="Message" description="Include all relevant information.">
                <TextInput
                    customID="message"
                    style={TextInputStyles.PARAGRAPH}
                    placeholder="Write your message here..."
                    minLength={20}
                    maxLength={1000}
                    required
                />
            </ModalLabel>
            <ModalLabel label="Supporting media" description="Optional; up to ten files.">
                <FileUpload customID="attachments" minValues={0} maxValues={10} required={false} />
            </ModalLabel>
        </>
    });
}

defineCommand({
    enabled,
    name: "modmail:post",
    ownerOnly: true,
    description: "Post the ticket panel",
    usage: null,
    execute() {
        return Vaius.rest.channels.createMessage(channelId,
            <ComponentMessage>
                <Container>
                    <TextDisplay># Contact the moderation team</TextDisplay>
                    <TextDisplay>Open a private ticket for an issue in this server that needs moderator attention.</TextDisplay>
                    <Separator spacing={SeparatorSpacingSize.LARGE} />
                    <TextDisplay>{`-# For Equicord support and general questions, please use <#${Config.channels.support}> instead.`}</TextDisplay>
                    <ActionRow>
                        <Button customID={Ids.OPEN_TICKET} style={ButtonStyles.SECONDARY} emoji={{ name: "📩" }}>
                            Open a ticket
                        </Button>
                    </ActionRow>
                </Container>
            </ComponentMessage>
        );
    }
});

if (enabled) {
    registerChatInputCommand({
        name: commandName,
        description: "Open a private moderation ticket"
    }, {
        guildOnly: true,
        handle: createTicketModal
    });

    handleComponentInteraction({
        customID: Ids.OPEN_TICKET,
        guildOnly: true,
        handle: createTicketModal
    });

    handleInteraction({
        type: InteractionTypes.MODAL_SUBMIT,
        guildOnly: true,
        isMatch: interaction => interaction.data.customID === Ids.OPEN_SUBMIT,
        async handle(interaction: ModalSubmitInteraction<TextChannel>) {
            if (interaction.member.roles.includes(banRoleId)) {
                return interaction.createMessage({
                    content: "You are banned from opening tickets.",
                    flags: MessageFlags.EPHEMERAL
                });
            }

            const reason = interaction.data.components.getStringSelectValues("reason", true)[0] as TicketReason;
            const reasonInfo = Reasons[reason];
            if (!reasonInfo)
                return interaction.createMessage({ content: "Invalid ticket reason.", flags: MessageFlags.EPHEMERAL });

            await interaction.defer(MessageFlags.EPHEMERAL);
            await ensureTicketsTable();

            const thread = await db.transaction().execute(async transaction => {
                const ticket = await transaction.insertInto("tickets")
                    .values({ channelId: "0", userId: interaction.user.id })
                    .onConflict(conflict => conflict.column("userId").doUpdateSet({ id: expression => expression.ref("excluded.id") }))
                    .returning(["channelId", "id"])
                    .executeTakeFirstOrThrow();

                if (ticket.channelId !== "0") {
                    await interaction.createFollowup({
                        content: `You already have an open ticket: <#${ticket.channelId}>`,
                        flags: MessageFlags.EPHEMERAL
                    });
                    return null;
                }

                const newThread = await getThreadParent().startThreadWithoutMessage({
                    type: ChannelTypes.PRIVATE_THREAD,
                    name: `${reasonInfo[0]}-${ticket.id}`,
                    invitable: false
                });

                await transaction.updateTable("tickets")
                    .set("channelId", newThread.id)
                    .where("id", "=", ticket.id)
                    .execute();

                return newThread;
            });

            if (!thread) return;

            const attachments = interaction.data.components.getFileUploadValues("attachments") ?? [];
            const files = await Promise.all(attachments.map(async ({ url, filename, contentType }, index) => ({
                name: `${index}-${filename}`,
                contents: await fetchBuffer(url),
                contentType
            })));
            const images = files.filter(file => file.contentType?.startsWith("image/"));
            const otherFiles = files.filter(file => !file.contentType?.startsWith("image/"));
            const message = interaction.data.components.getTextInput("message", true);

            await thread.createMessage({
                content: `<@&${modRoleId}>`,
                allowedMentions: { roles: [modRoleId] }
            });

            await thread.createMessage(
                <ComponentMessage allowedMentions={{ users: [interaction.user.id] }} files={files}>
                    <Container>
                        <TextDisplay>👋 {interaction.user.mention}<br /><br />{reasonInfo[2]}<br />A moderator will be with you shortly.</TextDisplay>
                    </Container>
                    <Container>
                        <TextDisplay>### User Message<br />{message}</TextDisplay>
                        {files.length > 0 && <Separator spacing={SeparatorSpacingSize.LARGE} divider={false} />}
                        {images.length > 0 && <MediaGallery>{images.map(file => <MediaGalleryItem url={`attachment://${file.name}`} />)}</MediaGallery>}
                        {otherFiles.map(file => <File filename={file.name} />)}
                    </Container>
                    <ActionRow>
                        <Button customID={`${Ids.CLOSE}${thread.id}`} style={ButtonStyles.DANGER}>Close ticket</Button>
                        <Button customID={`${Ids.CLOSE_BAN}${thread.id}`} style={ButtonStyles.DANGER}>Close & ban from tickets</Button>
                        <Button customID={`${Ids.MANAGE_ROLES}${thread.id}`} style={ButtonStyles.SECONDARY}>Manage roles</Button>
                    </ActionRow>
                </ComponentMessage>
            );

            await interaction.createFollowup({ content: `Your ticket is ready: ${thread.mention}`, flags: MessageFlags.EPHEMERAL });
            await log(`${interaction.user.mention} opened ${kebabToTitle(thread.name)} (${thread.mention}).`);
        }
    });

    handleInteraction({
        type: InteractionTypes.MESSAGE_COMPONENT,
        guildOnly: true,
        isMatch: interaction => interaction.data.customID.startsWith(Ids.CLOSE) || interaction.data.customID.startsWith(Ids.CLOSE_BAN),
        async handle(interaction) {
            if (interaction.channel.type !== ChannelTypes.PRIVATE_THREAD || interaction.channel.threadMetadata.archived)
                return;

            const isModerator = interaction.member.roles.includes(modRoleId);
            const banUser = interaction.data.customID.startsWith(Ids.CLOSE_BAN);
            if (banUser && !isModerator) return;

            await ensureTicketsTable();
            const ticket = await db.selectFrom("tickets")
                .where("channelId", "=", interaction.channel.id)
                .select(["id", "userId"])
                .executeTakeFirst();
            if (!ticket || (!isModerator && ticket.userId !== interaction.user.id)) return;

            await interaction.defer(MessageFlags.EPHEMERAL);
            await interaction.channel.edit({ archived: true, locked: true });
            await db.deleteFrom("tickets").where("id", "=", ticket.id).execute();

            const member = await interaction.guild.getMember(ticket.userId).catch(() => null);
            if (banUser && member)
                await member.addRole(banRoleId, `Banned from tickets by ${interaction.user.tag}`);

            if (member) {
                const status = banUser ? "closed and you have been banned from opening tickets" : "closed as resolved";
                await sendDm(member.user, { content: `Your ticket has been ${status}. You can still find it in the Threads tab if you need the history.` });
            }

            await interaction.createFollowup({ content: "Ticket closed.", flags: MessageFlags.EPHEMERAL });
            await log(`${interaction.user.mention} closed ${interaction.channel.mention}${banUser ? " and banned the ticket opener" : ""}.`);
        }
    });

    handleInteraction({
        type: InteractionTypes.MESSAGE_COMPONENT,
        guildOnly: true,
        isMatch: interaction => interaction.data.customID.startsWith(Ids.MANAGE_ROLES),
        async handle(interaction) {
            if (!interaction.member.roles.includes(modRoleId)) return;

            const options = MANAGEABLE_ROLES
                .map(roleId => interaction.guild.roles.get(roleId))
                .filter(isNonNullish)
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, 25)
                .map(role => <StringOption label={role.name} value={role.id} />);

            await interaction.createMessage(
                <ComponentMessage flags={MessageFlags.EPHEMERAL}>
                    <Container>
                        <TextDisplay>## Manage ticket opener roles</TextDisplay>
                        <ActionRow><StringSelect customID={interaction.data.customID.replace(Ids.MANAGE_ROLES, Ids.ADD_ROLE)} placeholder="Add role">{options}</StringSelect></ActionRow>
                        <ActionRow><StringSelect customID={interaction.data.customID.replace(Ids.MANAGE_ROLES, Ids.REMOVE_ROLE)} placeholder="Remove role">{options}</StringSelect></ActionRow>
                    </Container>
                </ComponentMessage>
            );
        }
    });

    handleInteraction({
        type: InteractionTypes.MESSAGE_COMPONENT,
        guildOnly: true,
        isMatch: interaction => interaction.data.customID.startsWith(Ids.ADD_ROLE) || interaction.data.customID.startsWith(Ids.REMOVE_ROLE),
        async handle(interaction: ComponentInteraction<ComponentTypes.STRING_SELECT, AnyTextableGuildChannel>) {
            if (!interaction.member.roles.includes(modRoleId)) return;

            const roleId = interaction.data.values.getStrings()[0];
            if (!roleId || !MANAGEABLE_ROLES.includes(roleId)) return;

            await ensureTicketsTable();
            const ticket = await db.selectFrom("tickets")
                .where("channelId", "=", interaction.channel.id)
                .select("userId")
                .executeTakeFirst();
            if (!ticket) return;

            const isAdd = interaction.data.customID.startsWith(Ids.ADD_ROLE);
            await interaction.defer(MessageFlags.EPHEMERAL);
            await interaction.guild[isAdd ? "addMemberRole" : "removeMemberRole"](
                ticket.userId,
                roleId,
                `${isAdd ? "Added" : "Removed"} by ${interaction.user.tag} in ticket`
            );
            await interaction.createFollowup({ content: `Role <@&${roleId}> ${isAdd ? "added to" : "removed from"} the ticket opener.`, flags: MessageFlags.EPHEMERAL });
        }
    });

    Vaius.once("ready", () => {
        if (PROD)
            Vaius.editStatus("online", [{ type: ActivityTypes.LISTENING, name: "/modmail" }]);
    });
}
