const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, ICONS, createErrorEmbed } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

const BANK_USERNAME = 'GemBank46';
const MIN_WITHDRAWAL = 20000000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('requestwithdraw')
        .setDescription('Request a gem withdrawal to your PS99 mailbox')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Amount of gems to withdraw (minimum 20M, e.g., "20m", "50m")')
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
        
        if (amount < MIN_WITHDRAWAL) {
            return interaction.reply({
                embeds: [createErrorEmbed(`Minimum withdrawal amount is **${MIN_WITHDRAWAL.toLocaleString()}** gems (20M).`)],
                ephemeral: true
            });
        }
        
        if (user.balance < amount) {
            return interaction.reply({
                embeds: [createErrorEmbed(`Insufficient balance! You have **${user.balance.toLocaleString()}** gems but requested **${amount.toLocaleString()}** gems.`)],
                ephemeral: true
            });
        }
        
        const pendingWithdrawals = db.getUserPendingWithdrawals(interaction.user.id);
        if (pendingWithdrawals.length >= 2) {
            const embed = createPS99Embed({
                title: 'Too Many Pending Withdrawals',
                color: PS99_COLORS.error,
                description: 'You already have 2 pending withdrawal requests. Please wait for them to be processed before submitting more.'
            });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
        if (user.balance < amount + totalPending) {
            return interaction.reply({
                embeds: [createErrorEmbed(`You have pending withdrawals totaling **${totalPending.toLocaleString()}** gems. Your available balance is **${(user.balance - totalPending).toLocaleString()}** gems.`)],
                ephemeral: true
            });
        }
        
        const request = db.createWithdrawRequest(
            interaction.user.id,
            interaction.user.username,
            amount,
            robloxUsername
        );
        
        const embed = createPS99Embed({
            title: `${ICONS.money} Withdrawal Request Created`,
            color: PS99_COLORS.success,
            description: `Your withdrawal request has been submitted!\n\n**Request ID:** \`#${request.id}\`\n**Amount:** \`${amount.toLocaleString()}\` gems\n**Roblox Username:** \`${robloxUsername}\``,
            fields: [
                {
                    name: `${ICONS.info} What Happens Next`,
                    value: `1. Ping the **Withdraw** role in your ticket\n2. Staff will process your request\n3. Gems will be sent from \`${BANK_USERNAME}\` to your Roblox account\n4. Your Discord balance will be deducted after processing`
                },
                {
                    name: `${ICONS.bank} Your Balance`,
                    value: `**Current:** \`${user.balance.toLocaleString()}\` gems\n**After Withdrawal:** \`${(user.balance - amount).toLocaleString()}\` gems`
                }
            ],
            footer: `Request ID: #${request.id} • Pending processing`
        });
        
        await interaction.reply({ embeds: [embed] });

        db.addLog({
            type: 'withdrawal_request',
            userId: interaction.user.id,
            username: interaction.user.username,
            amount: amount,
            robloxUsername: robloxUsername,
            requestId: request.id
        });

        const withdrawChannelId = db.getWithdrawChannel();
        if (withdrawChannelId) {
            try {
                const channel = await client.channels.fetch(withdrawChannelId).catch(() => null);
                if (channel) {
                    const notifyEmbed = new EmbedBuilder()
                        .setTitle(`${ICONS.money} New Withdrawal Request`)
                        .setColor(PS99_COLORS.orange)
                        .setDescription(`A new withdrawal request needs processing!\n\n**Request ID:** \`#${request.id}\`\n**Discord User:** <@${interaction.user.id}>\n**Roblox Username:** \`${robloxUsername}\`\n**Amount:** \`${amount.toLocaleString()}\` gems`)
                        .addFields({
                            name: 'Staff Action Required',
                            value: `1. Send \`${amount.toLocaleString()}\` gems from \`${BANK_USERNAME}\` mailbox\n2. Send to Roblox user: \`${robloxUsername}\`\n3. Use \`/processwithdraw ${request.id}\` to complete`
                        })
                        .setTimestamp()
                        .setFooter({ text: `Requested by ${interaction.user.username}` });
                    
                    await channel.send({ embeds: [notifyEmbed] });
                }
            } catch (error) {
                console.error('Error sending withdrawal notification:', error);
            }
        }
    }
};
