const db = require('../database/db');
const { createErrorEmbed, createPS99Embed, PS99_COLORS } = require('../utils/embedBuilder');
const { createRaffleEmbed, createRaffleButtons } = require('../commands/raffle');

module.exports = {
    customId: 'raffle',
    
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        
        if (action === 'view') {
            const raffle = db.getRaffle();
            if (!raffle) {
                return interaction.reply({ embeds: [createErrorEmbed('No active raffle!')], ephemeral: true });
            }
            
            return interaction.reply({
                embeds: [createRaffleEmbed(raffle, 'active')],
                ephemeral: true
            });
        }
        
        if (action === 'join') {
            const tickets = parseInt(parts[2]) || 1;
            const raffle = db.getRaffle();
            
            if (!raffle) {
                return interaction.reply({ embeds: [createErrorEmbed('No active raffle!')], ephemeral: true });
            }
            
            if (Date.now() > raffle.endTime) {
                return interaction.reply({ embeds: [createErrorEmbed('This raffle has ended!')], ephemeral: true });
            }
            
            const result = db.joinRaffle(interaction.user.id, interaction.user.username, tickets);
            
            if (!result.success) {
                return interaction.reply({ embeds: [createErrorEmbed(result.reason)], ephemeral: true });
            }
            
            const totalCost = tickets * raffle.ticketCost;
            
            db.addLog({
                type: 'raffle_join',
                userId: interaction.user.id,
                username: interaction.user.username,
                tickets: tickets,
                cost: totalCost
            });
            
            const updatedRaffle = db.getRaffle();
            
            await interaction.update({
                embeds: [createRaffleEmbed(updatedRaffle, 'active')],
                components: [createRaffleButtons(false)]
            });
            
            const userData = db.getUser(interaction.user.id);
            const chance = ((result.tickets / updatedRaffle.totalTickets) * 100).toFixed(1);
            
            await interaction.followUp({
                embeds: [createPS99Embed({
                    title: '🎟️ Tickets Purchased!',
                    description: `You bought **${tickets}** ticket(s) for **${totalCost.toLocaleString()}** gems!\n\nYou now have **${result.tickets}** tickets (**${chance}%** chance to win!)`,
                    color: PS99_COLORS.success,
                    footer: `Balance: ${userData.balance.toLocaleString()} gems`
                })],
                ephemeral: true
            });
        }
    }
};
