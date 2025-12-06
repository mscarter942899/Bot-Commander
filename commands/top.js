const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createLeaderboardEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('View the leaderboard')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(false)
                .addChoices(
                    { name: 'Balance', value: 'balance' },
                    { name: 'Winnings', value: 'winnings' }
                )),
    
    async execute(interaction) {
        const type = interaction.options.getString('type') || 'balance';
        const topUsers = db.getTopUsers(10, type);
        const embed = createLeaderboardEmbed(topUsers, type);
        
        await interaction.reply({ embeds: [embed] });
    }
};
