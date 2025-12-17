const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS, createErrorEmbed, createPremiumEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Deposit gems into your bank')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount to deposit (number or "all")')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const amountStr = interaction.options.getString('amount').toLowerCase();
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        let amount;
        if (amountStr === 'all') {
            amount = user.balance;
        } else {
            amount = parseInt(amountStr);
        }
        
        if (isNaN(amount) || amount <= 0) {
            return interaction.reply({ embeds: [createErrorEmbed('Please enter a valid amount!')], ephemeral: true });
        }
        
        if (user.balance < amount) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        const oldBalance = user.balance;
        const oldBank = user.bank;
        db.addToBank(interaction.user.id, amount);
        const newBalance = oldBalance - amount;
        const newBank = oldBank + amount;
        
        const embed = createPS99Embed({
            title: '🏦 Deposit Successful!',
            color: PS99_COLORS.success,
            description: `You deposited **${amount.toLocaleString()}** gems into your bank!`,
            fields: [
                { name: '💰 Cash', value: `\`${newBalance.toLocaleString()}\` gems`, inline: true },
                { name: '🏦 Bank', value: `\`${newBank.toLocaleString()}\` gems`, inline: true }
            ]
        });
        
        db.addLog({
            type: 'deposit',
            userId: interaction.user.id,
            username: interaction.user.username,
            amount: amount
        });
        
        await interaction.reply({ embeds: [embed] });

        const depositChannelId = db.getDepositChannel();
        if (depositChannelId) {
            try {
                const channel = await client.channels.fetch(depositChannelId).catch(() => null);
                if (channel) {
                    const notifyEmbed = createPremiumEmbed({
                        title: 'Bank Deposit',
                        titleIcon: ICONS.bank,
                        color: PS99_COLORS.info,
                        description: `\`\`\`ansi\n[1;34m╭─────────────────────────────╮[0m\n[1;34m│[0m    [1;33m🏦 DEPOSIT MADE 🏦[0m    [1;34m│[0m\n[1;34]╰─────────────────────────────╯[0m\`\`\`\n\n${ICONS.crown} **User:** <@${interaction.user.id}>\n${ICONS.gem} **Amount:** \`${amount.toLocaleString()}\` gems\n${ICONS.bank} **New Bank Balance:** \`${newBank.toLocaleString()}\` gems`,
                        footer: `Deposited by ${interaction.user.username}`
                    });
                    await channel.send({ embeds: [notifyEmbed] });
                }
            } catch (error) {
                console.error('Error sending deposit notification:', error);
            }
        }
    }
};
