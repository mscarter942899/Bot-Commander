const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw gems from your bank')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount to withdraw (number or "all")')
                .setRequired(true)),
    
    async execute(interaction) {
        const amountStr = interaction.options.getString('amount').toLowerCase();
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        let amount;
        if (amountStr === 'all') {
            amount = user.bank;
        } else {
            amount = parseInt(amountStr);
        }
        
        if (isNaN(amount) || amount <= 0) {
            return interaction.reply({ embeds: [createErrorEmbed('Please enter a valid amount!')], ephemeral: true });
        }
        
        if (user.bank < amount) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems in your bank! You have \`${user.bank.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.withdrawFromBank(interaction.user.id, amount);
        
        const embed = createPS99Embed({
            title: '🏦 Withdrawal Successful!',
            color: PS99_COLORS.success,
            description: `You withdrew **${amount.toLocaleString()}** gems from your bank!`,
            fields: [
                { name: '💰 Cash', value: `\`${(user.balance + amount).toLocaleString()}\` gems`, inline: true },
                { name: '🏦 Bank', value: `\`${(user.bank - amount).toLocaleString()}\` gems`, inline: true }
            ]
        });
        
        db.addLog({
            type: 'withdraw',
            userId: interaction.user.id,
            username: interaction.user.username,
            amount: amount
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
