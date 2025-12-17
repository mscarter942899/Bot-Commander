const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS, createErrorEmbed, createPremiumEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw gems from your bank')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount to withdraw (number or "all")')
                .setRequired(true)),
    
    async execute(interaction, client) {
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
        
        const oldBalance = user.balance;
        const oldBank = user.bank;
        db.withdrawFromBank(interaction.user.id, amount);
        const newBalance = oldBalance + amount;
        const newBank = oldBank - amount;
        
        const embed = createPS99Embed({
            title: '🏦 Withdrawal Successful!',
            color: PS99_COLORS.success,
            description: `You withdrew **${amount.toLocaleString()}** gems from your bank!`,
            fields: [
                { name: '💰 Cash', value: `\`${newBalance.toLocaleString()}\` gems`, inline: true },
                { name: '🏦 Bank', value: `\`${newBank.toLocaleString()}\` gems`, inline: true }
            ]
        });
        
        db.addLog({
            type: 'withdraw',
            userId: interaction.user.id,
            username: interaction.user.username,
            amount: amount
        });
        
        await interaction.reply({ embeds: [embed] });

        const withdrawChannelId = db.getWithdrawChannel();
        if (withdrawChannelId) {
            try {
                const channel = await client.channels.fetch(withdrawChannelId).catch(() => null);
                if (channel) {
                    const notifyEmbed = createPremiumEmbed({
                        title: 'Bank Withdrawal',
                        titleIcon: ICONS.money,
                        color: PS99_COLORS.orange,
                        description: `\`\`\`ansi\n[1;33m╭─────────────────────────────╮[0m\n[1;33m│[0m    [1;31m💵 WITHDRAWAL MADE 💵[0m    [1;33m│[0m\n[1;33]╰─────────────────────────────╯[0m\`\`\`\n\n${ICONS.crown} **User:** <@${interaction.user.id}>\n${ICONS.gem} **Amount:** \`${amount.toLocaleString()}\` gems\n${ICONS.bank} **New Bank Balance:** \`${newBank.toLocaleString()}\` gems`,
                        footer: `Withdrawn by ${interaction.user.username}`
                    });
                    await channel.send({ embeds: [notifyEmbed] });
                }
            } catch (error) {
                console.error('Error sending withdraw notification:', error);
            }
        }
    }
};
