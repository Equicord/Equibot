const Config = {
    "token": "",
    "prefixes": ["e!", "e?", "e.", "eq"],
    // id of the home guild of the bot. used for registering commands, etc
    "homeGuildId": "",
    // "development" | "production"
    "mode": "production",

    "channels": {
        // channel where venbot will post automatic moderation logs, leave empty to disable
        "autoModLog": "",

        // channel where equibot will post moderation logs
        "modLog": "",

        // used as default for the not-support command and some other features
        "support": "",

        // channels where support commands are allowed.
        // always includes channels.support
        "supportAllowedChannels": [
            "", // bot spam
        ],
    },

    "moderation": {
        "invites": true,
        // guilds members may share invites to. always includes homeGuildId
        "inviteAllowedGuilds": [
            "1173279886065029291", // equicord
            "1015060230222131221", // vencord
            "811255666990907402", // aliucord
            "1015931589865246730", // vendetta
            "86004744966914048", // betterdiscord
            "538759280057122817", // powercord
            "950850315601711176", // enmity
            "920674107111137340", // stupidity archive
            "820732039253852171", // armcord
            "458997239738793984", // strencher
            "917308687423533086", // manti (reviewdb)
            "613425648685547541", // ddevs
            "891039687785996328", // kernel
            "244230771232079873", // progamers hangout
            "1096357702931841148", // decor
            "449175561529589761", // blackbox (userbg)
            "1196075698301968455", // pyoncord
            "1154257010532032512", // moonlight
            "961691461554950145", // hyprland
            "1097993424931672216", // aero
            "1116074561734197270", // dziurwa insane
            "820745488231301210", // ntts
            "603970300668805120", // discord previews
        ]
    },

    "roles": {
        // anyone with this role can execute moderation commands
        "mod": "",

        // used for github linking and some other things
        "donor": "",
        // used for github linking and some other things
        "contributor": "",
        // vencord contrib
        "vencordContrib": "",

        "regular": "",

        "fileWhitelist": "",

        // roles that can be added or removed using the role management commands.
        // always includes roles.donor, and roles.contributor
        "manageableRoles": [
            "", // no requests
            "", // no modmail
            "", // no support
            "", // no yappin
            "", // no media
            "", // no modmail
        ]
    },

    // http server used for some features.
    // github linking and reporter both depend on this server
    "httpServer": {
        "enabled": true,
        "port": 8152,
        "domain": "http://localhost:8152"
    },

    // link-github command which gives out contributor & donor roles
    "githubLinking": {
        "enabled": true,
        "clientId": "",
        "clientSecret": "",
        // Github Personal Access Token. Used to check if user is sponsoring you https://github.com/settings/tokens/new
        "pats": [
            ""
        ]
    },

    "reporter": {
        "enabled": true,
        // Github PAT with workflow dispatch scope. Used to trigger reporter workflow
        "pat": "",
        // generate with `openssl rand -hex 128`
        "webhookSecret": "",
        // channel where each individual report will be posted
        "logChannelId": "",
        // channel where the bot will post the latest status of stable and canary
        "statusChannelId": "",
        // message id of the stable status message (must be in statusChannelId)
        "stableMessageId": "",
        // message id of the canary status message (must be in statusChannelId)
        "canaryMessageId": "",
    }
};

export default Config;
