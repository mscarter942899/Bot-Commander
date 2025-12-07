const db = require('../database/db');
const { createInventoryEmbed, createInventoryButtons } = require('../commands/inventory');

module.exports = {
    customId: 'inventory',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        
        if (action === 'prev' || action === 'next') {
            const currentPage = parseInt(parts[2]);
            const newPage = action === 'prev' ? currentPage - 1 : currentPage + 1;
            
            const items = db.getInventory(interaction.user.id);
            const totalPages = Math.ceil(items.length / 10) || 1;
            
            const embed = createInventoryEmbed(interaction.user, items, newPage);
            
            await interaction.update({
                embeds: [embed],
                components: items.length > 0 ? [createInventoryButtons(newPage, totalPages)] : []
            });
            
        } else if (action === 'refresh') {
            const items = db.getInventory(interaction.user.id);
            const totalPages = Math.ceil(items.length / 10) || 1;
            
            const embed = createInventoryEmbed(interaction.user, items, 0);
            
            await interaction.update({
                embeds: [embed],
                components: items.length > 0 ? [createInventoryButtons(0, totalPages)] : []
            });
        }
    }
};
