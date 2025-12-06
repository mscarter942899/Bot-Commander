const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { createRaffleEmbed, createRaffleButtons } = require('../commands/raffle');

module.exports = {
    name: 'raffle',
    aliases: ['raf'],
    description: 'Raffle commands',
    
    async execute(message, args, client) {
        const action = args[0]?.toLowerCase();
        
        if (!action || action === 'view') {
            const raffle = db.getRaffle();
            if (!raffle) {
                return message.reply({ embeds: [createErrorEmbed('No active raffle!')] });
            }
            
            return message.reply({
                embeds: [createRaffleEmbed(raffle, 'active')],
                components: [createRaffleButtons(false)]
            });
        }
        
        if (action === 'join') {
            const tickets = parseInt(args[1]) || 1;
            const raffle = db.getRaffle();
            
            if (!raffle) {
                return message.reply({ embeds: [createErrorEmbed('No active raffle!')] });
            }
            
            const result = db.joinRaffle(message.author.id, message.author.username, tickets);
            
            if (!result.success) {
                return message.reply({ embeds: [createErrorEmbed(result.reason)] });
            }
            
            const updatedRaffle = db.getRaffle();
            const chance = ((result.tickets / updatedRaffle.totalTickets) * 100).toFixed(1);
            
            return message.reply({
                embeds: [createPS99Embed({
                    title: '🎟️ Tickets Purchased!',
                    description: `You bought **${tickets}** ticket(s)!\n\nYou now have **${result.tickets}** tickets (**${chance}%** chance to win!)`,
                    color: PS99_COLORS.success
                })]
            });
        }
        
        return message.reply({ embeds: [createErrorEmbed('Usage: `!raffle [view|join <tickets>]`')] });
    }
};
