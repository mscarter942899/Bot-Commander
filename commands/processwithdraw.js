const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS, createErrorEmbed } = require('../utils/embedBuilder');

const BANK_USERNAME = 'GemBank46';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('processwithdraw')
        .setDescription('Staff: Process a pending withdrawal request')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption(option =>
            option.setName('request_id')
                .setDescription('The withdrawal request ID to process')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const requestId = interaction.options.getInteger('request_id');
        
        const pendingWithdrawal = db.getPendingWithdrawalById(requestId);
        if (!pendingWithdrawal) {
            return interaction.reply({
                embeds: [createErrorEmbed(`Withdrawal request #${requestId} not found or already processed.`)],
                ephemeral: true
            });
        }
        
        const result = db.processWithdrawal(
            requestId,
            interaction.user.id,
            interaction.user.username
        );
        
        if (!result.success) {
            return interaction.reply({
                embeds: [createErrorEmbed(result.reason)],
                ephemeral: true
            });
        }
        
        const withdrawal = result.withdrawal;
        const user = db.getUser(withdrawal.userId);
        
        const embed = createPS99Embed({
            title: `${ICONS.success} Withdrawal Processed`,
            color: PS99_COLORS.success,
            description: `Withdrawal request **#${requestId}** has been processed!\n\n**Remember:** Send \`${withdrawal.amount.toLocaleString()}\` gems from \`${BANK_USERNAME}\` to \`${withdrawal.robloxUsername}\` via PS99 mailbox.`,
            fields: [
                { name: 'User', value: `<@${withdrawal.userId}>`, inline: true },
                { name: 'Roblox Username', value: `\`${withdrawal.robloxUsername}\``, inline: true },
                { name: 'Amount Sent', value: `\`${withdrawal.amount.toLocaleString()}\` gems`, inline: true },
                { name: 'New Balance', value: `\`${user.balance.toLocaleString()}\` gems`, inline: true },
                { name: 'Processed By', value: `<@${interaction.user.id}>`, inline: true }
            ],
            footer: `Request ID: #${requestId}`
        });
        
        await interaction.reply({ embeds: [embed] });
        
        db.addLog({
            type: 'withdrawal_processed',
            userId: withdrawal.userId,
            username: withdrawal.username,
            amount: withdrawal.amount,
            robloxUsername: withdrawal.robloxUsername,
            requestId: requestId,
            processedBy: interaction.user.id,
            processedByUsername: interaction.user.username
        });

        try {
            const withdrawUser = await client.users.fetch(withdrawal.userId).catch(() => null);
            if (withdrawUser) {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`${ICONS.money} Withdrawal Processed!`)
                    .setColor(PS99_COLORS.success)
                    .setDescription(`Your withdrawal has been processed! Check your PS99 mailbox.`)
                    .addFields(
                        { name: 'Amount Sent', value: `\`${withdrawal.amount.toLocaleString()}\` gems`, inline: true },
                        { name: 'Sent To', value: `\`${withdrawal.robloxUsername}\``, inline: true },
                        { name: 'Sent From', value: `\`${BANK_USERNAME}\``, inline: true },
                        { name: 'Remaining Balance', value: `\`${user.balance.toLocaleString()}\` gems`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Request ID: #${requestId}` });
                
                await withdrawUser.send({ embeds: [dmEmbed] }).catch(() => {});
            }
        } catch (error) {
            console.error('Error sending withdrawal confirmation DM:', error);
        }
    }
};
