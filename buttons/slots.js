const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');

const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS } = require('../utils/embedBuilder');

module.exports = {
    customId: 'slots',
    
    async execute(interaction, client) {
        const [action, type, betStr] = interaction.customId.split('_');
        
        if (type === 'payouts') {
            const payoutsEmbed = new EmbedBuilder()
                .setTitle('🎰 Slot Machine Payouts 🎰')
                .setColor(PS99_COLORS.gold)
                .setDescription('Match 3 symbols on the middle row to win!')
                .addFields(
                    { name: '💎 Three Diamonds', value: '**50x** your bet', inline: true },
                    { name: '7️⃣ Three Sevens', value: '**25x** your bet', inline: true },
                    { name: '⭐ Three Stars', value: '**10x** your bet', inline: true },
                    { name: '🔔 Three Bells', value: '**8x** your bet', inline: true },
                    { name: '🍉 Three Watermelons', value: '**5x** your bet', inline: true },
                    { name: '🍊 Three Oranges', value: '**4x** your bet', inline: true },
                    { name: '🍋 Three Lemons', value: '**3x** your bet', inline: true },
                    { name: '🍒 Three Cherries', value: '**2x** your bet', inline: true },
                    { name: '🎲 Two Matching', value: '**0.5x** your bet (50%)', inline: true }
                )
                .setFooter({ text: '💎 Good luck spinning! 💎' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [payoutsEmbed], ephemeral: true });
        }
        
        let bet = parseInt(betStr);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (type === 'double') {
            bet = bet * 2;
        } else if (type === 'max') {
            bet = Math.min(user.balance, 10000);
        }
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        const slotsCommand = client.commands.get('slots');
        interaction.options = {
            getInteger: (name) => name === 'bet' ? bet : null
        };
        
        await slotsCommand.execute(interaction, client);
    }
};
