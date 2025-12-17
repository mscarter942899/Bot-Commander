const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transactionhistory')
        .setDescription('View your completed transaction history'),
    
    async execute(interaction, client) {
        const history = db.getTransactionHistory(interaction.user.id, 10);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        let description = `**Current Balance:** \`${user.balance.toLocaleString()}\` gems\n\n`;
        
        if (history.length === 0) {
            description += 'No completed transactions yet.';
        } else {
            description += '**Recent Transactions:**\n\n';
            for (const tx of history) {
                const date = new Date(tx.completedAt).toLocaleDateString();
                const icon = tx.transactionType === 'deposit' ? ICONS.gem : ICONS.money;
                const type = tx.transactionType === 'deposit' ? 'Deposit' : 'Withdrawal';
                const amount = tx.finalAmount || tx.amount;
                
                description += `${icon} **${type}** - \`${amount.toLocaleString()}\` gems\n`;
                description += `└ ${date} | #${tx.id}\n\n`;
            }
        }
        
        const embed = createPS99Embed({
            title: `${ICONS.bank} Transaction History`,
            color: PS99_COLORS.info,
            description: description,
            footer: `Showing last 10 transactions`
        });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
