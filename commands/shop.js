const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createPS99Embed, createSuccessEmbed } = require('../utils/embedBuilder');

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

function createShopButtons(page, totalPages, itemCount) {
    const row = new ActionRowBuilder();
    
    row.addComponents(
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
    
    return row;
}

function createItemSelectMenu(items, page = 0, itemsPerPage = 5) {
    const start = page * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);
    
    if (pageItems.length === 0) return null;
    
    const options = pageItems.map((item, i) => ({
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

function createItemEmbed(item) {
    const stockText = item.stock === null ? 'Unlimited' : item.stock;
    
    const embed = new EmbedBuilder()
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
    
    if (item.image) {
        embed.setImage(item.image);
    }
    
    return embed;
}

function createBuyButtons(itemId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`shop_confirm_${itemId}`)
            .setLabel('✅ Buy Now')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('shop_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Shop commands')
        .addSubcommand(sub =>
            sub.setName('browse')
                .setDescription('Browse items in the shop')
                .addStringOption(opt => opt.setName('category').setDescription('Filter by category')))
        .addSubcommand(sub =>
            sub.setName('buy')
                .setDescription('Buy an item from the shop')
                .addIntegerOption(opt => opt.setName('id').setDescription('Item ID to buy').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add an item to the shop (Admin only)')
                .addStringOption(opt => opt.setName('name').setDescription('Item name').setRequired(true))
                .addIntegerOption(opt => opt.setName('price').setDescription('Item price in gems').setRequired(true).setMinValue(1))
                .addStringOption(opt => opt.setName('description').setDescription('Item description'))
                .addStringOption(opt => opt.setName('category').setDescription('Item category'))
                .addIntegerOption(opt => opt.setName('stock').setDescription('Stock quantity (leave empty for unlimited)'))
                .addStringOption(opt => opt.setName('image').setDescription('Image URL')))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove an item from the shop (Admin only)')
                .addIntegerOption(opt => opt.setName('id').setDescription('Item ID to remove').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Edit a shop item (Admin only)')
                .addIntegerOption(opt => opt.setName('id').setDescription('Item ID to edit').setRequired(true))
                .addStringOption(opt => opt.setName('name').setDescription('New item name'))
                .addIntegerOption(opt => opt.setName('price').setDescription('New price'))
                .addStringOption(opt => opt.setName('description').setDescription('New description'))
                .addStringOption(opt => opt.setName('category').setDescription('New category'))
                .addIntegerOption(opt => opt.setName('stock').setDescription('New stock (-1 for unlimited)'))
                .addStringOption(opt => opt.setName('image').setDescription('New image URL'))
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/disable item')))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all shop items with IDs (Admin only)')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'browse') {
            const category = interaction.options.getString('category');
            const items = db.getShopItems(category);
            
            if (items.length === 0) {
                return interaction.reply({ 
                    embeds: [createPS99Embed({ 
                        title: '🛒 Shop', 
                        description: category ? `No items in category "${category}"` : 'The shop is empty!', 
                        color: PS99_COLORS.info 
                    })], 
                    ephemeral: true 
                });
            }
            
            const embed = createShopEmbed(items, 0);
            const selectMenu = createItemSelectMenu(items, 0);
            const buttons = createShopButtons(0, Math.ceil(items.length / 5), items.length);
            
            const components = selectMenu ? [selectMenu, buttons] : [buttons];
            
            await interaction.reply({
                embeds: [embed],
                components: components
            });
            
        } else if (subcommand === 'buy') {
            const itemId = interaction.options.getInteger('id');
            const item = db.getShopItem(itemId);
            
            if (!item || !item.enabled) {
                return interaction.reply({ embeds: [createErrorEmbed('Item not found!')], ephemeral: true });
            }
            
            await interaction.reply({
                embeds: [createItemEmbed(item)],
                components: [createBuyButtons(itemId)],
                ephemeral: true
            });
            
        } else if (subcommand === 'add') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            const name = interaction.options.getString('name');
            const price = interaction.options.getInteger('price');
            const description = interaction.options.getString('description') || '';
            const category = interaction.options.getString('category') || 'General';
            const stock = interaction.options.getInteger('stock') || null;
            const image = interaction.options.getString('image') || null;
            
            const item = db.addShopItem({ name, price, description, category, stock, image });
            
            db.addLog({
                type: 'shop_add',
                userId: interaction.user.id,
                username: interaction.user.username,
                item: name,
                price: price
            });
            
            await interaction.reply({
                embeds: [createSuccessEmbed('Item Added!', `**${name}** has been added to the shop!\nID: ${item.id} | Price: \`${price.toLocaleString()}\` gems`)]
            });
            
        } else if (subcommand === 'remove') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            const itemId = interaction.options.getInteger('id');
            const item = db.removeShopItem(itemId);
            
            if (!item) {
                return interaction.reply({ embeds: [createErrorEmbed('Item not found!')], ephemeral: true });
            }
            
            db.addLog({
                type: 'shop_remove',
                userId: interaction.user.id,
                username: interaction.user.username,
                item: item.name
            });
            
            await interaction.reply({
                embeds: [createSuccessEmbed('Item Removed!', `**${item.name}** has been removed from the shop.`)]
            });
            
        } else if (subcommand === 'edit') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            const itemId = interaction.options.getInteger('id');
            const item = db.getShopItem(itemId);
            
            if (!item) {
                return interaction.reply({ embeds: [createErrorEmbed('Item not found!')], ephemeral: true });
            }
            
            const updates = {};
            const name = interaction.options.getString('name');
            const price = interaction.options.getInteger('price');
            const description = interaction.options.getString('description');
            const category = interaction.options.getString('category');
            const stock = interaction.options.getInteger('stock');
            const image = interaction.options.getString('image');
            const enabled = interaction.options.getBoolean('enabled');
            
            if (name) updates.name = name;
            if (price) updates.price = price;
            if (description) updates.description = description;
            if (category) updates.category = category;
            if (stock !== null) updates.stock = stock === -1 ? null : stock;
            if (image) updates.image = image;
            if (enabled !== null) updates.enabled = enabled;
            
            const updatedItem = db.updateShopItem(itemId, updates);
            
            db.addLog({
                type: 'shop_edit',
                userId: interaction.user.id,
                username: interaction.user.username,
                item: updatedItem.name,
                changes: Object.keys(updates)
            });
            
            await interaction.reply({
                embeds: [createSuccessEmbed('Item Updated!', `**${updatedItem.name}** has been updated.`)]
            });
            
        } else if (subcommand === 'list') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            const items = db.getAllShopItems();
            
            if (items.length === 0) {
                return interaction.reply({ embeds: [createPS99Embed({ title: '🛒 All Shop Items', description: 'No items in the shop!', color: PS99_COLORS.info })] });
            }
            
            let description = '';
            items.forEach(item => {
                const status = item.enabled ? '✅' : '❌';
                const stock = item.stock === null ? '∞' : item.stock;
                description += `${status} **ID ${item.id}:** ${item.name} - \`${item.price.toLocaleString()}\` gems (${stock})\n`;
            });
            
            await interaction.reply({
                embeds: [createPS99Embed({
                    title: '🛒 All Shop Items',
                    description: description,
                    color: PS99_COLORS.neon
                })],
                ephemeral: true
            });
        }
    }
};

module.exports.createShopEmbed = createShopEmbed;
module.exports.createItemEmbed = createItemEmbed;
