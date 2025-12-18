const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addgems')
        .setDescription('Add gems to a user (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add gems to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount of gems (e.g., 1000, 2.5m, 1b) to add')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
        }
        
        const targetUser = interaction.options.getUser('user');
        const amountInput = interaction.options.getString('amount');
        const amount = parseGemAmount(amountInput);
        
        db.getUser(targetUser.id, targetUser.username);
        db.addBalance(targetUser.id, amount);
        
        const embed = createPS99Embed({
            title: '💰 Gems Added!',
            color: PS99_COLORS.success,
            description: `Added **${amount.toLocaleString()}** gems to ${targetUser}!`,
            fields: [
                { name: '👤 Target', value: `${targetUser}`, inline: true },
                { name: '💎 Amount', value: `\`${amount.toLocaleString()}\` gems`, inline: true }
            ],
            footer: `Added by ${interaction.user.username}`
        });
        
        db.addLog({
            type: 'admin_add',
            adminId: interaction.user.id,
            adminUsername: interaction.user.username,
            targetId: targetUser.id,
            targetUsername: targetUser.username,
            amount: amount
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
