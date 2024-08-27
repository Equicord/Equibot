import { defineCommand } from "~/Command"
import { codeblock, reply } from "~/util"
import { resolveUser } from "~/util/resolvers"
import * as antiHusk from "~/modules/antiHusk"

defineCommand({
    name: "husklimit",
    description: "Get a user's husk quota",
    aliases: "hl",
    guildOnly: true,
    usage: "[user]",
    async execute(msg, userPtr) {
        const user = userPtr ? await resolveUser(userPtr).catch(() => null) : (msg.referencedMessage?? msg). author
        if (!user) return reply(msg, "bro fake")
        const { id } = user
        if (!antiHusk.HuskAbuserIds.has(id)) return reply(msg, "bro may husk")
        const amt = antiHusk.HusksUsedPerUser.get(id) - antiHusk.MaxAllowedHusksPerHour
        if (!amt) return reply(msg, "bro mayn't husk")
        if (amt == -1) return reply(msg, `bro owes me a husk`)
        if (amt < 0) return reply(msg, `bro owes me ${amt} husks`)
        if (amt == 1) return reply(msg, `bro only got one husk`)
        return reply(msg, `bro got ${amt} husks`)
    }
})
