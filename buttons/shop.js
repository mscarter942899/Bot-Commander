const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createSuccessEmbed, createPremiumEmbed } = require('../utils/embedBuilder');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

function createShopEmbed(items, page = 0, itemsPerPage = 5) {
    const start = page * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);
    const totalPages = Math.ceil(items.length / itemsPerPage);
    
    const embed = new EmbedBuilder()
        .setTitle('🛒 ═══ SHOP ═══ 🛒')
        .setColor(PS99_COLORS.neon)
        .setFooter({ text: `Page ${page + 1}/${totalPages} | 💎 PS99 Casino 💎` })
        .setTimestamp();
    
    if (pageItems.length === 0) {
        embed.setDescription('The shop is empty! Check back later.');
        return embed;
    }
    
    let description = '';
    pageItems.forEach((item, i) => {
        const stockText = item.stock === null ? '∞' : item.stock;
        description += `**${start + i + 1}. ${item.name}** - \`${item.price.toLocaleString()}\` gems\n`;
        if (item.description) description += `   *${item.description}*\n`;
        description += `   📦 Stock: ${stockText} | 🏷️ ${item.category}\n\n`;
    });
    
    embed.setDescription(description);
    return embed;
}

function createItemEmbed(item) {
    const stockText = item.stock === null ? 'Unlimited' : item.stock;
    
    return new EmbedBuilder()
        .setTitle(`🛍️ ${item.name}`)
        .setColor(PS99_COLORS.neon)
        .setDescription(item.description || 'No description available')
        .addFields(
            { name: '💰 Price', value: `\`${item.price.toLocaleString()}\` gems`, inline: true },
            { name: '📦 Stock', value: stockText.toString(), inline: true },
            { name: '🏷️ Category', value: item.category, inline: true }
        )
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
}

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
            .setCustomId('shop_select')
            .setPlaceholder('Select an item to purchase...')
            .addOptions(options)
    );
}

module.exports = {
    customId: 'shop',
    async execute(interaction, client) {
        try {
            if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
                const itemId = parseInt(interaction.values[0]);
                const item = db.getShopItem(itemId);
                
                if (!item || !item.enabled) {
                    return await interaction.reply({ embeds: [createErrorEmbed('Item not found!')], ephemeral: true });
                }
                
                const user = db.getUser(interaction.user.id);
                if (user.balance < item.price) {
                    return await interaction.reply({ 
                        embeds: [createErrorEmbed(`You need \`${item.price.toLocaleString()}\` gems but only have \`${user.balance.toLocaleString()}\` gems!`)], 
                        ephemeral: true 
                    });
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
                return;
            }
            
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
                const item = db.getShopItem(itemId);
                
                if (!item || !item.enabled) {
                    return interaction.reply({ embeds: [createErrorEmbed('Item no longer available!')], ephemeral: true });
                }
                
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
                    embeds: [createPremiumEmbed({
                        title: 'Cancelled',
                        titleIcon: '❌',
                        description: 'Purchase cancelled.',
                        color: PS99_COLORS.info
                    })],
                    components: []
                });
            }
        } catch (error) {
            console.error('Shop handler error:', error);
            if (!interaction.replied) {
                await interaction.reply({ embeds: [createErrorEmbed('An error occurred!')], ephemeral: true }).catch(() => {});
            }
        }
    }
};
