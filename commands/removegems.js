const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removegems')
        .setDescription('Remove gems from a user (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to remove gems from')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of gems to remove')
                .setRequired(true)
                .setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
        }
        
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        const userData = db.getUser(targetUser.id, targetUser.username);
        const removed = Math.min(amount, userData.balance);
        db.removeBalance(targetUser.id, removed);
        
        const embed = createPS99Embed({
            title: '💸 Gems Removed!',
            color: PS99_COLORS.error,
            description: `Removed **${removed.toLocaleString()}** gems from ${targetUser}!`,
            fields: [
                { name: '👤 Target', value: `${targetUser}`, inline: true },
                { name: '💎 Removed', value: `\`${removed.toLocaleString()}\` gems`, inline: true }
            ],
            footer: `Removed by ${interaction.user.username}`
        });
        
        db.addLog({
            type: 'admin_remove',
            adminId: interaction.user.id,
            adminUsername: interaction.user.username,
            targetId: targetUser.id,
            targetUsername: targetUser.username,
            amount: removed
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
