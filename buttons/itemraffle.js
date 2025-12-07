const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');
const { createItemRaffleEmbed, createItemRaffleButtons } = require('../commands/itemraffle');

module.exports = {
    customId: 'itemraffle',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        
        if (action === 'join') {
            const tickets = parseInt(parts[2]);
            const raffle = db.getItemRaffle();
            
            if (!raffle) {
                return interaction.reply({ embeds: [createErrorEmbed('No active item raffle!')], ephemeral: true });
            }
            
            const result = db.joinItemRaffle(interaction.user.id, interaction.user.username, tickets);
            
            if (!result.success) {
                return interaction.reply({ embeds: [createErrorEmbed(result.reason)], ephemeral: true });
            }
            
            const updatedRaffle = db.getItemRaffle();
            
            await interaction.update({
                embeds: [createItemRaffleEmbed(updatedRaffle, 'active')],
                components: [createItemRaffleButtons(false)]
            });
            
            await interaction.followUp({
                embeds: [createSuccessEmbed('Tickets Purchased!', `You now have **${result.tickets}** tickets in the item raffle!\n\nPrize: **${raffle.prize.name}**`)],
                ephemeral: true
            });
            
        } else if (action === 'view') {
            const raffle = db.getItemRaffle();
            
            if (!raffle) {
                return interaction.reply({ embeds: [createErrorEmbed('No active item raffle!')], ephemeral: true });
            }
            
            await interaction.reply({
                embeds: [createItemRaffleEmbed(raffle, 'active')],
                components: [createItemRaffleButtons(false)],
                ephemeral: true
            });
        }
    }
};
