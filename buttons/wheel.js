
const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS } = require('../utils/embedBuilder');

module.exports = {
    customId: 'wheel',
    
    async execute(interaction, client) {
        const [action, type, betStr] = interaction.customId.split('_');
        
        if (type === 'info') {
            const infoEmbed = new EmbedBuilder()
                .setTitle('🎰 Fortune Wheel Multipliers 🎰')
                .setColor(PS99_COLORS.gold)
                .setDescription('Spin the wheel and win based on where it lands!\n\n**Bet Tiers:**\n🔹 **Low** (<100 gems): Lower jackpot chance\n💠 **Medium** (100-999 gems): Balanced odds\n💎 **High** (1000+ gems): Better multiplier chances')
                .addFields(
                    { name: '💎 50x Diamond', value: 'Ultra rare jackpot!', inline: true },
                    { name: '10x', value: 'Rare big win', inline: true },
                    { name: '5x', value: 'Great multiplier', inline: true },
                    { name: '3x', value: 'Nice win', inline: true },
                    { name: '2x', value: 'Double your bet', inline: true },
                    { name: '1x', value: 'Break even', inline: true },
                    { name: '0.5x', value: 'Get half back', inline: true },
                    { name: '❌ 0x', value: 'Lose everything', inline: true }
                )
                .setFooter({ text: '🎡 Higher bets = Better odds for big multipliers!' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [infoEmbed], ephemeral: true });
        }
        
        let bet = parseInt(betStr);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (type === 'double') {
            bet = bet * 2;
        } else if (type === 'max') {
            bet = Math.min(user.balance, 10000);
        }
        
        if (user.balance < bet) {
            return interaction.reply({ 
                embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], 
                ephemeral: true 
            });
        }
        
        const wheelCommand = client.commands.get('wheel');
        interaction.options = {
            getInteger: (name) => name === 'bet' ? bet : null
        };
        
        await wheelCommand.execute(interaction, client);
    }
};
