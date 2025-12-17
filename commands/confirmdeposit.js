const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confirmdeposit')
        .setDescription('Staff: Confirm a pending deposit request')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption(option =>
            option.setName('request_id')
                .setDescription('The deposit request ID to confirm')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('actual_amount')
                .setDescription('Actual amount received (if different from requested)')
                .setRequired(false)),
    
    async execute(interaction, client) {
        const requestId = interaction.options.getInteger('request_id');
        const actualAmount = interaction.options.getInteger('actual_amount');
        
        const pendingDeposit = db.getPendingDepositById(requestId);
        if (!pendingDeposit) {
            return interaction.reply({
                embeds: [createErrorEmbed(`Deposit request #${requestId} not found or already processed.`)],
                ephemeral: true
            });
        }
        
        const deposit = db.confirmDeposit(
            requestId,
            interaction.user.id,
            interaction.user.username,
            actualAmount
        );
        
        if (!deposit) {
            return interaction.reply({
                embeds: [createErrorEmbed('Failed to confirm deposit. Please try again.')],
                ephemeral: true
            });
        }
        
        const finalAmount = deposit.finalAmount;
        const user = db.getUser(deposit.userId);
        
        const embed = createPS99Embed({
            title: `${ICONS.success} Deposit Confirmed`,
            color: PS99_COLORS.success,
            description: `Deposit request **#${requestId}** has been confirmed!`,
            fields: [
                { name: 'User', value: `<@${deposit.userId}>`, inline: true },
                { name: 'Roblox Username', value: `\`${deposit.robloxUsername}\``, inline: true },
                { name: 'Amount Credited', value: `\`${finalAmount.toLocaleString()}\` gems`, inline: true },
                { name: 'New Balance', value: `\`${user.balance.toLocaleString()}\` gems`, inline: true },
                { name: 'Confirmed By', value: `<@${interaction.user.id}>`, inline: true }
            ],
            footer: `Request ID: #${requestId}`
        });
        
        await interaction.reply({ embeds: [embed] });
        
        db.addLog({
            type: 'deposit_confirmed',
            userId: deposit.userId,
            username: deposit.username,
            amount: finalAmount,
            requestId: requestId,
            confirmedBy: interaction.user.id,
            confirmedByUsername: interaction.user.username
        });

        try {
            const depositUser = await client.users.fetch(deposit.userId).catch(() => null);
            if (depositUser) {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`${ICONS.gem} Deposit Confirmed!`)
                    .setColor(PS99_COLORS.success)
                    .setDescription(`Your deposit has been verified and credited to your account!`)
                    .addFields(
                        { name: 'Amount Credited', value: `\`${finalAmount.toLocaleString()}\` gems`, inline: true },
                        { name: 'New Balance', value: `\`${user.balance.toLocaleString()}\` gems`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Request ID: #${requestId}` });
                
                await depositUser.send({ embeds: [dmEmbed] }).catch(() => {});
            }
        } catch (error) {
            console.error('Error sending deposit confirmation DM:', error);
        }
    }
};
