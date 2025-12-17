const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pendingtransactions')
        .setDescription('Staff: View all pending deposit and withdrawal requests')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Filter by transaction type')
                .setRequired(false)
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: 'Deposits Only', value: 'deposits' },
                    { name: 'Withdrawals Only', value: 'withdrawals' }
                )),
    
    async execute(interaction, client) {
        const type = interaction.options.getString('type') || 'all';
        
        const pendingDeposits = db.getPendingDeposits();
        const pendingWithdrawals = db.getPendingWithdrawals();
        
        const embeds = [];
        
        if (type === 'all' || type === 'deposits') {
            if (pendingDeposits.length > 0) {
                let depositList = '';
                for (const deposit of pendingDeposits.slice(0, 10)) {
                    const timeAgo = formatTimeAgo(deposit.createdAt);
                    depositList += `**#${deposit.id}** | <@${deposit.userId}>\n`;
                    depositList += `└ \`${deposit.amount.toLocaleString()}\` gems from \`${deposit.robloxUsername}\` (${timeAgo})\n\n`;
                }
                
                const depositEmbed = new EmbedBuilder()
                    .setTitle(`${ICONS.gem} Pending Deposits (${pendingDeposits.length})`)
                    .setColor(PS99_COLORS.info)
                    .setDescription(depositList || 'No pending deposits')
                    .addFields({
                        name: 'Staff Commands',
                        value: '`/confirmdeposit <id>` - Confirm a deposit\n`/canceldeposit <id>` - Cancel a deposit'
                    })
                    .setTimestamp();
                
                embeds.push(depositEmbed);
            } else if (type === 'deposits') {
                const depositEmbed = new EmbedBuilder()
                    .setTitle(`${ICONS.gem} Pending Deposits`)
                    .setColor(PS99_COLORS.success)
                    .setDescription('No pending deposit requests!')
                    .setTimestamp();
                embeds.push(depositEmbed);
            }
        }
        
        if (type === 'all' || type === 'withdrawals') {
            if (pendingWithdrawals.length > 0) {
                let withdrawList = '';
                let totalPending = 0;
                
                for (const withdrawal of pendingWithdrawals.slice(0, 10)) {
                    const timeAgo = formatTimeAgo(withdrawal.createdAt);
                    withdrawList += `**#${withdrawal.id}** | <@${withdrawal.userId}>\n`;
                    withdrawList += `└ \`${withdrawal.amount.toLocaleString()}\` gems to \`${withdrawal.robloxUsername}\` (${timeAgo})\n\n`;
                    totalPending += withdrawal.amount;
                }
                
                const withdrawEmbed = new EmbedBuilder()
                    .setTitle(`${ICONS.money} Pending Withdrawals (${pendingWithdrawals.length})`)
                    .setColor(PS99_COLORS.orange)
                    .setDescription(withdrawList || 'No pending withdrawals')
                    .addFields(
                        { name: 'Total Pending', value: `\`${totalPending.toLocaleString()}\` gems`, inline: true },
                        { name: 'Staff Commands', value: '`/processwithdraw <id>` - Process a withdrawal\n`/cancelwithdraw <id>` - Cancel a withdrawal' }
                    )
                    .setTimestamp();
                
                embeds.push(withdrawEmbed);
            } else if (type === 'withdrawals') {
                const withdrawEmbed = new EmbedBuilder()
                    .setTitle(`${ICONS.money} Pending Withdrawals`)
                    .setColor(PS99_COLORS.success)
                    .setDescription('No pending withdrawal requests!')
                    .setTimestamp();
                embeds.push(withdrawEmbed);
            }
        }
        
        if (embeds.length === 0) {
            const noTransactions = new EmbedBuilder()
                .setTitle(`${ICONS.success} All Clear!`)
                .setColor(PS99_COLORS.success)
                .setDescription('No pending transactions to process.')
                .setTimestamp();
            embeds.push(noTransactions);
        }
        
        await interaction.reply({ embeds: embeds });
    }
};

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
