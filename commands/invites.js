const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Check your invite count and rewards'),

    async execute(interaction) {
        const inviteSettings = db.getInviteSettings();
        const inviteCount = db.getInviteCount(interaction.user.id);
        const totalEarned = inviteCount * (inviteSettings.amount || 100);

        const embed = createPremiumEmbed({
            title: `${interaction.user.username}'s Invites`,
            titleIcon: ICONS.gift,
            color: PS99_COLORS.purple,
            description: `\`\`\`ansi\n[1;35m╭─────────────────────────────╮[0m\n[1;35m│[0m    [1;33m📧 INVITE STATS 📧[0m    [1;35m│[0m\n[1;35]╰─────────────────────────────╯[0m\`\`\``,
            fields: [
                { icon: '👥', name: 'Total Invites', value: `\`${inviteCount}\``, inline: true },
                { icon: ICONS.gem, name: 'Gems Earned', value: `\`${totalEarned.toLocaleString()}\``, inline: true },
                { icon: inviteSettings.enabled ? ICONS.check : ICONS.cross, name: 'Rewards Active', value: inviteSettings.enabled ? '`Yes`' : '`No`', inline: true }
            ],
            footer: inviteSettings.enabled 
                ? `Earn ${inviteSettings.amount?.toLocaleString() || 0} gems per invite!`
                : 'Invite rewards are currently disabled'
        });

        await interaction.reply({ embeds: [embed] });
    }
};
