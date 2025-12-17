module.exports = {
    name: 'inviteDelete',
    async execute(invite, client) {
        client.inviteCache = client.inviteCache || new Map();
        const guildInvites = client.inviteCache.get(invite.guild.id);
        if (guildInvites) {
            guildInvites.delete(invite.code);
        }
    }
};
