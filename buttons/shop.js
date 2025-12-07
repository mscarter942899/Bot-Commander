const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');
const { createShopEmbed, createItemEmbed } = require('../commands/shop');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

function createShopButtons(page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`shop_prev_${page}`)
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`shop_next_${page}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );
}

function createItemSelectMenu(items, page = 0, itemsPerPage = 5) {
    const start = page * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);
    
    if (pageItems.length === 0) return null;
    
    const options = pageItems.map(item => ({
        label: `${item.name} - ${item.price.toLocaleString()} gems`,
        description: item.description ? item.description.substring(0, 50) : 'No description',
        value: item.id.toString()
    }));
    
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('shop_buy')
            .setPlaceholder('Select an item to purchase...')
            .addOptions(options)
    );
}

module.exports = {
    customId: 'shop',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        
        if (action === 'prev' || action === 'next') {
            const currentPage = parseInt(parts[2]);
            const newPage = action === 'prev' ? currentPage - 1 : currentPage + 1;
            
            const items = db.getShopItems();
            const totalPages = Math.ceil(items.length / 5);
            
            const embed = createShopEmbed(items, newPage);
            const selectMenu = createItemSelectMenu(items, newPage);
            const buttons = createShopButtons(newPage, totalPages);
            
            const components = selectMenu ? [selectMenu, buttons] : [buttons];
            
            await interaction.update({
                embeds: [embed],
                components: components
            });
            
        } else if (action === 'confirm') {
            const itemId = parseInt(parts[2]);
            
            const result = db.buyShopItem(interaction.user.id, itemId);
            
            if (!result.success) {
                return interaction.reply({ embeds: [createErrorEmbed(result.reason)], ephemeral: true });
            }
            
            db.addLog({
                type: 'shop_purchase',
                userId: interaction.user.id,
                username: interaction.user.username,
                item: result.item.name,
                price: result.item.price
            });
            
            await interaction.update({
                embeds: [createSuccessEmbed('Purchase Complete!', `You bought **${result.item.name}** for \`${result.item.price.toLocaleString()}\` gems!\n\nCheck your inventory with \`/inventory view\``)],
                components: []
            });
            
        } else if (action === 'cancel') {
            await interaction.update({
                embeds: [createSuccessEmbed('Cancelled', 'Purchase cancelled.')],
                components: []
            });
            
        } else if (action === 'buy' || interaction.isStringSelectMenu()) {
            const itemId = parseInt(interaction.values ? interaction.values[0] : parts[2]);
            const item = db.getShopItem(itemId);
            
            if (!item || !item.enabled) {
                return interaction.reply({ embeds: [createErrorEmbed('Item not found!')], ephemeral: true });
            }
            
            const buyButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`shop_confirm_${itemId}`)
                    .setLabel('✅ Buy Now')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('shop_cancel')
                    .setLabel('❌ Cancel')
                    .setStyle(ButtonStyle.Danger)
            );
            
            await interaction.reply({
                embeds: [createItemEmbed(item)],
                components: [buyButtons],
                ephemeral: true
            });
        }
    }
};
