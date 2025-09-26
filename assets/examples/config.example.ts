const Config = {
    "token": "",
    "prefixes": ["e!", "e?", "e.", "eq"],
    // id of the home guild of the bot. used for registering commands, etc
    "homeGuildId": "",
    // "development" | "production"
    "mode": "production",

    "channels": {
        // channel where equibot will post moderation logs
        "modLog": "",

        // this is where equibot will send information like errors
        "dev": "",
        // used as default for the not-support command and some other features
        "support": "",

        // channels where support commands are allowed.
        // always includes channels.dev and channels.support
        "supportAllowedChannels": [
            "", // bot spam
        ],
    },

    "roles": {
        // anyone with this role can execute moderation commands
        "mod": "",

        // used for github linking and some other things
        "donor": "",
        // used for github linking and some other things
        "contributor": "",

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

    // known issue command
    "knownIssues": {
        "enabled": true,
        "knownIssuesForumId": ""
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
        "pat": ""
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
        // latest chan id for below
        "latestChanId": "",
        // message id of the stable status message (must be in latestChanId)
        "stableMessageId": "",
        // message id of the canary status message (must be in latestChanId)
        "canaryMessageId": "",
    }
};

export default Config;
