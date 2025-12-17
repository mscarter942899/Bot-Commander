module.exports = {
    name: 'inviteCreate',
    async execute(invite, client) {
        client.inviteCache = client.inviteCache || new Map();
        const guildInvites = client.inviteCache.get(invite.guild.id) || new Map();
        guildInvites.set(invite.code, invite);
        client.inviteCache.set(invite.guild.id, guildInvites);
    }
};
