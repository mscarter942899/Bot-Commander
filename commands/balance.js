const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createBalanceEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your gem balance')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to check balance of')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userData = db.getUser(targetUser.id, targetUser.username);
        
        const embed = createBalanceEmbed(targetUser, userData.balance, userData.bank);
        await interaction.reply({ embeds: [embed] });
    }
};
