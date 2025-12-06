const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Make an announcement (Admin only)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Announcement message')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Announcement title')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
        }
        
        const message = interaction.options.getString('message');
        const title = interaction.options.getString('title') || '📢 Announcement';
        
        const embed = createPS99Embed({
            title: title,
            color: PS99_COLORS.gold,
            description: message,
            footer: `Announced by ${interaction.user.username}`
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
