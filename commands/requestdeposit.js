const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS, createErrorEmbed } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

const BANK_USERNAME = 'GemBank46';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('requestdeposit')
        .setDescription('Request a gem deposit from PS99 mailbox')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount of gems you sent via PS99 mailbox (e.g., "1000", "5m")')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const amount = parseGemAmount(interaction.options.getString('amount'));
        const user = db.getUser(interaction.user.id, interaction.user.username);
        const robloxAccount = db.getRobloxAccount(interaction.user.id);
        
        if (!robloxAccount) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('❌ You must link your Roblox account first!\n\nUse `/link` to link your Roblox username.')],
                ephemeral: true 
            });
        }
        
        if (amount <= 0) {
            return interaction.reply({ embeds: [createErrorEmbed('Please enter a valid amount!')], ephemeral: true });
        }
        
        const robloxUsername = robloxAccount.username;
        
        const pendingDeposits = db.getUserPendingDeposits(interaction.user.id);
        if (pendingDeposits.length >= 3) {
            const embed = createPS99Embed({
                title: 'Too Many Pending Deposits',
                color: PS99_COLORS.error,
                description: 'You already have 3 pending deposit requests. Please wait for them to be processed before submitting more.'
            });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const request = db.createDepositRequest(
            interaction.user.id,
            interaction.user.username,
            amount,
            robloxUsername
        );
        
        const embed = createPS99Embed({
            title: `${ICONS.gem} Deposit Request Created`,
            color: PS99_COLORS.success,
            description: `Your deposit request has been submitted!\n\n**Request ID:** \`#${request.id}\`\n**Amount:** \`${amount.toLocaleString()}\` gems\n**Roblox Username:** \`${robloxUsername}\``,
            fields: [
                {
                    name: `${ICONS.info} Instructions`,
                    value: `1. Send **${amount.toLocaleString()}** gems via PS99 mailbox to:\n   **Roblox Username:** \`${BANK_USERNAME}\`\n2. Ping the **Deposit** role in your ticket\n3. Staff will verify the mailbox and confirm your deposit\n4. Your Discord balance will be updated after confirmation`
                },
                {
                    name: `${ICONS.warning} Important`,
                    value: `• Make sure you send the exact amount stated\n• Your deposit is only credited after staff confirmation\n• All deposits are logged for security`
                }
            ],
            footer: `Request ID: #${request.id} • Pending verification`
        });
        
        await interaction.reply({ embeds: [embed] });

        db.addLog({
            type: 'deposit_request',
            userId: interaction.user.id,
            username: interaction.user.username,
            amount: amount,
            robloxUsername: robloxUsername,
            requestId: request.id
        });

        const depositChannelId = db.getDepositChannel();
        if (depositChannelId) {
            try {
                const channel = await client.channels.fetch(depositChannelId).catch(() => null);
                if (channel) {
                    const notifyEmbed = new EmbedBuilder()
                        .setTitle(`${ICONS.gem} New Deposit Request`)
                        .setColor(PS99_COLORS.warning)
                        .setDescription(`A new deposit request needs verification!\n\n**Request ID:** \`#${request.id}\`\n**Discord User:** <@${interaction.user.id}>\n**Roblox Username:** \`${robloxUsername}\`\n**Amount:** \`${amount.toLocaleString()}\` gems`)
                        .addFields({
                            name: 'Staff Action Required',
                            value: `1. Check the mailbox on \`${BANK_USERNAME}\`\n2. Verify gems received from \`${robloxUsername}\`\n3. Use \`/confirmdeposit ${request.id}\` to credit the user`
                        })
                        .setTimestamp()
                        .setFooter({ text: `Requested by ${interaction.user.username}` });
                    
                    await channel.send({ embeds: [notifyEmbed] });
                }
            } catch (error) {
                console.error('Error sending deposit notification:', error);
            }
        }
    }
};
