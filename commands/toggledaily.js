const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggledaily')
        .setDescription('Enable or disable the daily rewards command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Enable or disable daily rewards')
                .setRequired(true)
                .addChoices(
                    { name: 'Enable', value: 'enable' },
                    { name: 'Disable', value: 'disable' }
                )),
    
    async execute(interaction) {
        const status = interaction.options.getString('status');
        const enable = status === 'enable';
        
        db.setDailyEnabled(enable);
        
        const embed = createPS99Embed({
            title: enable ? '✅ Daily Rewards Enabled' : '🚫 Daily Rewards Disabled',
            color: enable ? PS99_COLORS.success : PS99_COLORS.error,
            description: enable 
                ? 'Users can now claim their daily rewards!'
                : 'Daily rewards have been disabled. Users cannot claim daily gems.',
            footer: 'PS99 Casino Admin'
        });
        
        db.addLog({
            type: 'admin',
            action: 'toggle_daily',
            userId: interaction.user.id,
            username: interaction.user.username,
            enabled: enable
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
