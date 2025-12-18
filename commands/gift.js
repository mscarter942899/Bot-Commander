const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gift')
        .setDescription('Gift gems to another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to gift gems to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount of gems to gift (e.g., 1000, 2.5m, 1b)')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const amountInput = interaction.options.getString('amount');
        const amount = parseGemAmount(amountInput);
        
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ embeds: [createErrorEmbed('You cannot gift gems to yourself!')], ephemeral: true });
        }
        
        if (targetUser.bot) {
            return interaction.reply({ embeds: [createErrorEmbed('You cannot gift gems to bots!')], ephemeral: true });
        }
        
        const sender = db.getUser(interaction.user.id, interaction.user.username);
        if (sender.balance < amount) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${sender.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.getUser(targetUser.id, targetUser.username);
        db.giftGems(interaction.user.id, targetUser.id, amount);
        
        const embed = createPS99Embed({
            title: '🎁 Gift Sent!',
            color: PS99_COLORS.success,
            description: `You gifted **${amount.toLocaleString()}** gems to ${targetUser}!`,
            fields: [
                { name: '💰 Your New Balance', value: `\`${(sender.balance - amount).toLocaleString()}\` gems`, inline: true }
            ],
            footer: 'Sharing is caring!'
        });
        
        db.addLog({
            type: 'gift',
            fromUserId: interaction.user.id,
            fromUsername: interaction.user.username,
            toUserId: targetUser.id,
            toUsername: targetUser.username,
            amount: amount
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
