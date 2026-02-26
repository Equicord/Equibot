const Config = {
    "token": process.env.BOT_TOKEN,
    "prefixes": ["e!", "e?", "e.", "eq"],
    // id of the home guild of the bot. used for registering commands, etc
    "homeGuildId": "1173279886065029291",
    // "development" | "production"
    "mode": "production",

    "channels": {
        // channel where venbot will post automatic moderation logs, leave empty to disable
        "autoModLog": "1371890339169701908",

        // channel where venbot will post moderation logs
        "modLog": "1371890339169701908",

        "botAuditLog": "1371890339169701908",

        "dev": "1468780271221477440",

        // used as default for the not-support command and some other features
        "support": "1297590739911573585",

        // channels where support commands are allowed.
        // always includes channels.support
        "supportAllowedChannels": [
            "1281600060261535825", // bot spam
        ],
    },

    "moderation": {
        // nsfw image detection and punishment
        "nsfwConfidenceThreshold": 0.90,
        "nsfwTimeoutDuration": 1,
        "nsfwScanGifs": true,

        "invites": false,
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
        "team": "1173520023239786538",
        "mod": "1326406112144265257",

        "donor": "1173316879083896912",
        "regular": "1468770736134160628",
        "vip": "1217667142598529064",
        "fileWhitelist": "1448056449187188880",
        "contributor": "1222677964760682556",
        "vencordContrib": "1173343399470964856",
        "pkgMaintainers": "1305732092629356554",
        "distributors": "1331437433228623994",
        "artists": "1384565229794365522",
        "bugHunter": "1421844862759866474",
        "devTalk": "1383924171637129339",
        "noSupport": "1290007556869062762",

        // roles that can be added or removed using the role management commands.
        // always includes roles.donor, and roles.contributor
        "manageableRoles": [
            "1269861822077599765", // no requests
            "1302480459195879514", // no modmail
            "1290007556869062762", // no support
            "1319402584133468171", // no yappin
            "1421951277226791013", // no bug reporting
            "1407110358509818008", // no media & reactions
        ]
    },

    "badges": [
        "848339671629299742",
        "929208515883569182",
    ],

    // http server used for some features.
    // github linking and reporter both depend on this server
    "httpServer": {
        "enabled": true,
        "port": 8152,
        "domain": "https://equibot.equicord.org"
    },

    // link-github command which gives out contributor & donor roles
    "githubLinking": {
        "enabled": true,
        "clientId": process.env.CLIENT_ID,
        "clientSecret": process.env.CLIENT_SECRET,
        // Github Personal Access Token. Used to check if user is sponsoring you https://github.com/settings/tokens/new
        "pat": process.env.LINK_PAT
    },

    "reporter": {
        "enabled": true,
        // Github PAT with workflow dispatch scope. Used to trigger reporter workflow
        "pat": process.env.REPORTER_PAT,
        // generate with `openssl rand -hex 128`
        "webhookSecret": process.env.WEBHOOK_SECRET,
        // channel where each individual report will be posted
        "logChannelId": "1371881823369564201",
        // channel where the bot will post the latest status of stable and canary
        "statusChannelId": "1420915039417929778",
        // message id of the stable status message (must be in statusChannelId)
        "stableMessageId": "1421025558682271844",
        // message id of the canary status message (must be in statusChannelId)
        "canaryMessageId": "1421025557281243228",
    },

    "faqAutoResponse": {
        "enabled": true,
        "similarityThreshold": 0.80,
        "cooldownSeconds": 5,
        "minMessageLength": 10,
    }
};

export default Config;
