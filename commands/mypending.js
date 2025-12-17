const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mypending')
        .setDescription('View your pending deposit and withdrawal requests'),
    
    async execute(interaction, client) {
        const pendingDeposits = db.getUserPendingDeposits(interaction.user.id);
        const pendingWithdrawals = db.getUserPendingWithdrawals(interaction.user.id);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const embeds = [];
        
        let description = `**Current Balance:** \`${user.balance.toLocaleString()}\` gems\n\n`;
        
        if (pendingDeposits.length > 0) {
            description += `**${ICONS.gem} Pending Deposits (${pendingDeposits.length}):**\n`;
            for (const deposit of pendingDeposits) {
                const timeAgo = formatTimeAgo(deposit.createdAt);
                description += `• **#${deposit.id}** - \`${deposit.amount.toLocaleString()}\` gems from \`${deposit.robloxUsername}\` (${timeAgo})\n`;
            }
            description += '\n';
        } else {
            description += `**${ICONS.gem} Pending Deposits:** None\n\n`;
        }
        
        if (pendingWithdrawals.length > 0) {
            const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
            description += `**${ICONS.money} Pending Withdrawals (${pendingWithdrawals.length}):**\n`;
            for (const withdrawal of pendingWithdrawals) {
                const timeAgo = formatTimeAgo(withdrawal.createdAt);
                description += `• **#${withdrawal.id}** - \`${withdrawal.amount.toLocaleString()}\` gems to \`${withdrawal.robloxUsername}\` (${timeAgo})\n`;
            }
            description += `\n*Total pending withdrawal: \`${totalPending.toLocaleString()}\` gems*\n`;
            description += `*Available for new withdrawals: \`${(user.balance - totalPending).toLocaleString()}\` gems*`;
        } else {
            description += `**${ICONS.money} Pending Withdrawals:** None`;
        }
        
        const embed = createPS99Embed({
            title: `${ICONS.bank} Your Pending Transactions`,
            color: PS99_COLORS.info,
            description: description,
            footer: `Use /requestdeposit or /requestwithdraw to create new requests`
        });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
