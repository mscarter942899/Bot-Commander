const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('Set the logging channel (Admin only)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send logs to')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
        }
        
        const channel = interaction.options.getChannel('channel');
        db.setLogChannel(channel.id);
        
        const embed = createPS99Embed({
            title: '📝 Logging Channel Set!',
            color: PS99_COLORS.success,
            description: `All logs will now be sent to ${channel}!`,
            footer: 'All bets, wins, losses, and transactions will be logged.'
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
