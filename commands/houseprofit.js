const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('houseprofit')
        .setDescription('View house profit statistics (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
        }
        
        const houseProfit = db.getHouseProfit();
        const profitColor = houseProfit >= 0 ? PS99_COLORS.success : PS99_COLORS.error;
        const profitEmoji = houseProfit >= 0 ? '📈' : '📉';
        
        const embed = createPS99Embed({
            title: '🏛️ House Statistics',
            color: profitColor,
            fields: [
                { name: `${profitEmoji} Total House Profit`, value: `\`${houseProfit.toLocaleString()}\` gems`, inline: false }
            ],
            footer: 'The house always wins!'
        });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
