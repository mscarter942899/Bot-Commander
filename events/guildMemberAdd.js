const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS } = require('../utils/embedBuilder');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const inviteSettings = db.getInviteSettings();
        if (!inviteSettings.enabled) return;

        const accountAge = Date.now() - member.user.createdTimestamp;
        const minAgeMs = (inviteSettings.minAccountAge || 60) * 24 * 60 * 60 * 1000;

        if (db.hasJoinedBefore(member.guild.id, member.id)) {
            return;
        }

        db.markAsJoined(member.guild.id, member.id);

        if (accountAge < minAgeMs) {
            console.log(`⚠️ ${member.user.username} account too new for invite rewards`);
            return;
        }

        try {
            const newInvites = await member.guild.invites.fetch();
            const cachedInvites = client.inviteCache?.get(member.guild.id);
            
            if (!cachedInvites) {
                console.log(`⚠️ No cached invites for ${member.guild.name}, caching now...`);
                client.inviteCache = client.inviteCache || new Map();
                client.inviteCache.set(member.guild.id, newInvites);
                return;
            }

            let usedInvite = null;
            for (const [code, invite] of newInvites) {
                const cachedInv = cachedInvites.get(code);
                if (cachedInv && invite.uses > cachedInv.uses) {
                    usedInvite = invite;
                    break;
                }
            }

            if (!usedInvite) {
                for (const [code, invite] of newInvites) {
                    if (!cachedInvites.has(code) && invite.uses > 0) {
                        usedInvite = invite;
                        break;
                    }
                }
            }

            client.inviteCache.set(member.guild.id, newInvites);

            if (usedInvite && usedInvite.inviter && usedInvite.inviter.id !== member.id) {
                const inviterId = usedInvite.inviter.id;
                
                if (db.hasClaimedInviteReward(inviterId, member.id)) {
                    console.log(`⚠️ Invite reward already claimed for ${member.user.username}`);
                    return;
                }

                db.trackInvite(inviterId, member.id, member.user.createdTimestamp);
                db.markInviteRewardClaimed(inviterId, member.id);
                
                db.getUser(inviterId, usedInvite.inviter.username);
                db.addBalance(inviterId, inviteSettings.amount);

                console.log(`✅ Gave ${inviteSettings.amount} gems to ${usedInvite.inviter.username} for inviting ${member.user.username}`);

                if (inviteSettings.channelId) {
                    const channel = await client.channels.fetch(inviteSettings.channelId).catch(() => null);
                    if (channel) {
                        const totalInvites = db.getInviteCount(inviterId);
                        
                        const embed = createPremiumEmbed({
                            title: 'INVITE REWARD!',
                            titleIcon: ICONS.gift,
                            color: PS99_COLORS.success,
                            description: `\`\`\`\n╭─────────────────────────────╮\n│   🎉 NEW MEMBER INVITED! 🎉   │\n╰─────────────────────────────╯\`\`\`\n\n${ICONS.crown} **Inviter:** <@${inviterId}>\n${ICONS.party} **Invited:** <@${member.id}>\n${ICONS.gem} **Reward:** \`${inviteSettings.amount.toLocaleString()}\` gems\n${ICONS.chart} **Total Invites:** \`${totalInvites}\``,
                            footer: `Account age requirement: ${inviteSettings.minAccountAge || 60} days`
                        });
                        
                        await channel.send({ embeds: [embed] });
                    }
                }
            } else {
                console.log(`⚠️ Could not determine invite used for ${member.user.username}`);
            }
        } catch (error) {
            console.error('Error tracking invite:', error);
        }
    }
};
