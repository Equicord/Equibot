# Equibot Privacy Policy

**Last updated:** October 8, 2026

Equibot ("the bot", "we", "us") is a Discord bot run by the Equicord team for the [Equicord Discord server](https://equicord.org/discord). This policy explains what data the bot handles, why, and what you can do about it.

Equibot is free software. Its full source code is public at [github.com/Equicord/Equibot](https://github.com/Equicord/Equibot), so you can check every claim in this policy against the code.

## Summary

- Equibot only runs in the Equicord server. It is not a public bot.
- It reads messages in the server to provide commands and automatic moderation. **It does not store message history.**
- It stores a small amount of data tied to your Discord user ID, listed below.
- Some features send content to third-party services (Google, GitHub). These are listed below.
- We do not sell your data or use it for advertising.

## What we store

The bot keeps the following data in its own database and files. Nothing else is stored long-term.

| Data | When it's collected | Why | How long it's kept |
| --- | --- | --- | --- |
| Your Discord user ID and role IDs | When you leave the server while holding certain roles | To give those roles back if you rejoin (for example, so a mute can't be avoided by leaving and rejoining) | Until you rejoin, or until a moderator removes it |
| Your Discord user ID and GitHub account ID | When you link your GitHub account with the `link-github` command | To give you roles based on your GitHub contributions, sponsorships, or organization membership | Until you ask us to unlink it |
| Your Discord user ID and the ticket channel ID | When you open a modmail ticket | To connect you to your open ticket | Until the ticket is closed |
| Your Discord user ID | When a moderator mutes you from certain features | To enforce the mute | Until the mute is removed |
| Your Discord user ID, badge image, and badge tooltip | When an Equicord staff member gives you a badge (for example, a donor or translator badge) | To show your badge to other Equicord users | Until the badge is removed |

**Badges are public.** Badge images and tooltips are published at `badge.equicord.org` so the Equicord client can display them, and anyone can view them.

The bot also stores server settings (sticky messages, watched threads, and similar state). This data is about channels, not people.

## What we process but don't store

To work, the bot reads events Discord sends it, including messages, attachments, member joins and leaves, nicknames, and role changes. It handles these in memory and does not keep a copy. Specifically:

- **Commands.** The bot reads messages to find commands and respond to them.
- **Automatic moderation.** The bot checks messages, nicknames, invite links, and attachments for spam, scams, and harmful content. Image checks (text recognition and NSFW detection) run entirely on our own server. Images are not sent to any outside service for this.
- **Modmail tickets.** Tickets are private threads in the Equicord server. Messages and attachments you send there are stored by Discord, not by the bot, and moderators can read them. Closed tickets stay available in Discord for future reference.

## Moderation logs

When the bot or a moderator takes action, such as deleting a message, timing out or banning a member, or opening or closing a ticket, the bot posts a log message in a private staff channel in the Equicord server. These logs can include your username, user ID, and the content that triggered the action. Discord stores these logs and only Equicord staff can see them.

## Third-party services

Some features send data to outside services. Each service handles that data under its own privacy policy.

| Service | What's sent | When |
| --- | --- | --- |
| [Discord](https://discord.com/privacy) | Everything the bot does goes through Discord | Always |
| [Google Gemini API](https://policies.google.com/privacy) | The text of your message | Only when you chat with the bot's AI feature ("Clyde"), which is limited to certain roles |
| [Google Translate](https://policies.google.com/privacy) | The text you ask to translate | Only when you use a translate command |
| [GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) | An OAuth login you approve on GitHub | Only when you link your GitHub account. We use the access token once to check your public profile, contributions, sponsorship, and organization membership, and we don't keep it. |

Translation requests may be routed through a Cloudflare Worker that we run. The worker forwards requests and does not log them.

## Who can see your data

- **Equicord staff** (moderators and administrators) can see moderation logs, modmail tickets, and stored data as needed to run the server.
- **The bot host** can access the database and files on the server that runs the bot.
- **Anyone** can see public badges.

We do not sell, rent, or trade your data, and we do not share it with anyone except the services listed above.

## Your choices and rights

You can ask us to:

- show you what data the bot stores about you
- delete your stored data
- unlink your GitHub account

To make a request, open a modmail ticket in the [Equicord Discord server](https://equicord.org/discord).

Some data may be kept after a deletion request if we need it to enforce a ban or mute.

If you don't want the bot to process your messages at all, the only option is to not use the Equicord server, because the bot moderates every channel.

## Children

Equibot follows [Discord's Terms of Service](https://discord.com/terms), which require users to be at least 13 years old (or older where local law requires). We do not knowingly collect data from anyone under that age.

## Security

Data is stored on a server only the Equicord team can access. No system is perfectly secure, but we only keep the minimum data listed above.

## Changes to this policy

We may update this policy as the bot changes. The "Last updated" date at the top shows when it last changed, and the full history is in the [GitHub repository](https://github.com/Equicord/Equibot/commits/main/PRIVACY.md).

## Contact

For questions about this policy, open a modmail ticket in the [Equicord Discord server](https://equicord.org/discord).
