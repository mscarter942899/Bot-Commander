const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cancelwithdraw')
        .setDescription('Staff: Cancel a pending withdrawal request')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption(option =>
            option.setName('request_id')
                .setDescription('The withdrawal request ID to cancel')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for cancellation')
                .setRequired(false)),
    
    async execute(interaction, client) {
        const requestId = interaction.options.getInteger('request_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const pendingWithdrawal = db.getPendingWithdrawalById(requestId);
        if (!pendingWithdrawal) {
            return interaction.reply({
                embeds: [createErrorEmbed(`Withdrawal request #${requestId} not found or already processed.`)],
                ephemeral: true
            });
        }
        
        const withdrawal = db.cancelWithdrawal(
            requestId,
            interaction.user.id,
            interaction.user.username,
            reason
        );
        
        if (!withdrawal) {
            return interaction.reply({
                embeds: [createErrorEmbed('Failed to cancel withdrawal. Please try again.')],
                ephemeral: true
            });
        }
        
        const user = db.getUser(withdrawal.userId);
        
        const embed = createPS99Embed({
            title: `${ICONS.error} Withdrawal Cancelled`,
            color: PS99_COLORS.error,
            description: `Withdrawal request **#${requestId}** has been cancelled.\nUser's balance remains at **${user.balance.toLocaleString()}** gems.`,
            fields: [
                { name: 'User', value: `<@${withdrawal.userId}>`, inline: true },
                { name: 'Amount', value: `\`${withdrawal.amount.toLocaleString()}\` gems`, inline: true },
                { name: 'Cancelled By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Reason', value: reason }
            ],
            footer: `Request ID: #${requestId}`
        });
        
        await interaction.reply({ embeds: [embed] });
        
        db.addLog({
            type: 'withdrawal_cancelled',
            userId: withdrawal.userId,
            username: withdrawal.username,
            amount: withdrawal.amount,
            requestId: requestId,
            reason: reason,
            cancelledBy: interaction.user.id,
            cancelledByUsername: interaction.user.username
        });

        try {
            const withdrawUser = await client.users.fetch(withdrawal.userId).catch(() => null);
            if (withdrawUser) {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`${ICONS.warning} Withdrawal Request Cancelled`)
                    .setColor(PS99_COLORS.error)
                    .setDescription(`Your withdrawal request has been cancelled by staff. Your balance has not been changed.`)
                    .addFields(
                        { name: 'Amount', value: `\`${withdrawal.amount.toLocaleString()}\` gems`, inline: true },
                        { name: 'Your Balance', value: `\`${user.balance.toLocaleString()}\` gems`, inline: true },
                        { name: 'Reason', value: reason }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Request ID: #${requestId}` });
                
                await withdrawUser.send({ embeds: [dmEmbed] }).catch(() => {});
            }
        } catch (error) {
            console.error('Error sending withdrawal cancellation DM:', error);
        }
    }
};
