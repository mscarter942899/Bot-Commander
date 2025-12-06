const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createProfileEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your profile and stats')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view profile of')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userData = db.getUser(targetUser.id, targetUser.username);
        
        const embed = createProfileEmbed(targetUser, userData);
        await interaction.reply({ embeds: [embed] });
    }
};
