const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('canceldeposit')
        .setDescription('Staff: Cancel a pending deposit request')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption(option =>
            option.setName('request_id')
                .setDescription('The deposit request ID to cancel')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for cancellation')
                .setRequired(false)),
    
    async execute(interaction, client) {
        const requestId = interaction.options.getInteger('request_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const pendingDeposit = db.getPendingDepositById(requestId);
        if (!pendingDeposit) {
            return interaction.reply({
                embeds: [createErrorEmbed(`Deposit request #${requestId} not found or already processed.`)],
                ephemeral: true
            });
        }
        
        const deposit = db.cancelDeposit(
            requestId,
            interaction.user.id,
            interaction.user.username,
            reason
        );
        
        if (!deposit) {
            return interaction.reply({
                embeds: [createErrorEmbed('Failed to cancel deposit. Please try again.')],
                ephemeral: true
            });
        }
        
        const embed = createPS99Embed({
            title: `${ICONS.error} Deposit Cancelled`,
            color: PS99_COLORS.error,
            description: `Deposit request **#${requestId}** has been cancelled.`,
            fields: [
                { name: 'User', value: `<@${deposit.userId}>`, inline: true },
                { name: 'Original Amount', value: `\`${deposit.amount.toLocaleString()}\` gems`, inline: true },
                { name: 'Cancelled By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Reason', value: reason }
            ],
            footer: `Request ID: #${requestId}`
        });
        
        await interaction.reply({ embeds: [embed] });
        
        db.addLog({
            type: 'deposit_cancelled',
            userId: deposit.userId,
            username: deposit.username,
            amount: deposit.amount,
            requestId: requestId,
            reason: reason,
            cancelledBy: interaction.user.id,
            cancelledByUsername: interaction.user.username
        });

        try {
            const depositUser = await client.users.fetch(deposit.userId).catch(() => null);
            if (depositUser) {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`${ICONS.warning} Deposit Request Cancelled`)
                    .setColor(PS99_COLORS.error)
                    .setDescription(`Your deposit request has been cancelled by staff.`)
                    .addFields(
                        { name: 'Amount', value: `\`${deposit.amount.toLocaleString()}\` gems`, inline: true },
                        { name: 'Reason', value: reason }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Request ID: #${requestId}` });
                
                await depositUser.send({ embeds: [dmEmbed] }).catch(() => {});
            }
        } catch (error) {
            console.error('Error sending deposit cancellation DM:', error);
        }
    }
};
