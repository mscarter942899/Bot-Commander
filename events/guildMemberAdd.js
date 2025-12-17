const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS } = require('../utils/embedBuilder');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const inviteSettings = db.getInviteSettings();
        if (!inviteSettings.enabled) return;

        const accountAge = Date.now() - member.user.createdTimestamp;
        const minAgeMs = inviteSettings.minAccountAge * 24 * 60 * 60 * 1000;

        if (db.hasJoinedBefore(member.guild.id, member.id)) {
            return;
        }

        db.markAsJoined(member.guild.id, member.id);

        if (accountAge < minAgeMs) {
            return;
        }

        try {
            const newInvites = await member.guild.invites.fetch();
            const cachedInvites = client.inviteCache?.get(member.guild.id);
            
            if (!cachedInvites) {
                client.inviteCache = client.inviteCache || new Map();
                client.inviteCache.set(member.guild.id, newInvites);
                return;
            }

            const usedInvite = newInvites.find(inv => {
                const cachedInv = cachedInvites.get(inv.code);
                return cachedInv && inv.uses > cachedInv.uses;
            });

            client.inviteCache.set(member.guild.id, newInvites);

            if (usedInvite && usedInvite.inviter && usedInvite.inviter.id !== member.id) {
                const inviterId = usedInvite.inviter.id;
                
                if (db.hasClaimedInviteReward(inviterId, member.id)) {
                    return;
                }

                db.trackInvite(inviterId, member.id, member.user.createdTimestamp);
                db.markInviteRewardClaimed(inviterId, member.id);
                
                db.getUser(inviterId, usedInvite.inviter.username);
                db.addBalance(inviterId, inviteSettings.amount);

                if (inviteSettings.channelId) {
                    const channel = await client.channels.fetch(inviteSettings.channelId).catch(() => null);
                    if (channel) {
                        const totalInvites = db.getInviteCount(inviterId);
                        
                        const embed = createPremiumEmbed({
                            title: 'INVITE REWARD!',
                            titleIcon: ICONS.gift,
                            color: PS99_COLORS.success,
                            description: `\`\`\`ansi\n[1;32m╭─────────────────────────────╮[0m\n[1;32m│[0m    [1;33m🎉 NEW MEMBER INVITED! 🎉[0m    [1;32m│[0m\n[1;32]╰─────────────────────────────╯[0m\`\`\`\n\n${ICONS.crown} **Inviter:** <@${inviterId}>\n${ICONS.party} **Invited:** <@${member.id}>\n${ICONS.gem} **Reward:** \`${inviteSettings.amount.toLocaleString()}\` gems\n${ICONS.chart} **Total Invites:** \`${totalInvites}\``,
                            footer: `Account age requirement: ${inviteSettings.minAccountAge} days`
                        });
                        
                        await channel.send({ embeds: [embed] });
                    }
                }
            }
        } catch (error) {
            console.error('Error tracking invite:', error);
        }
    }
};
