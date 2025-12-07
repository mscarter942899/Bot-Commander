const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createPS99Embed, createSuccessEmbed } = require('../utils/embedBuilder');

function createInventoryEmbed(user, items, page = 0, itemsPerPage = 10) {
    const start = page * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);
    const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
    
    const embed = new EmbedBuilder()
        .setTitle(`🎒 ${user.username}'s Inventory`)
        .setColor(PS99_COLORS.purple)
        .setFooter({ text: `Page ${page + 1}/${totalPages} | ${items.length} items | 💎 PS99 Casino 💎` })
        .setTimestamp();
    
    if (pageItems.length === 0) {
        embed.setDescription('Your inventory is empty!\n\nBuy items from `/shop browse` or win them in raffles!');
        return embed;
    }
    
    let description = '';
    pageItems.forEach((item, i) => {
        const source = item.source === 'shop' ? '🛒' : item.source === 'raffle' ? '🎟️' : '🎁';
        const date = new Date(item.purchasedAt || item.wonAt || item.grantedAt).toLocaleDateString();
        description += `**${start + i + 1}.** ${source} ${item.name}\n`;
        if (item.description) description += `   *${item.description.substring(0, 40)}${item.description.length > 40 ? '...' : ''}*\n`;
        description += `   📅 ${date}\n`;
    });
    
    embed.setDescription(description);
    return embed;
}

function createInventoryButtons(page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`inventory_prev_${page}`)
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`inventory_next_${page}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
        new ButtonBuilder()
            .setCustomId('inventory_refresh')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
    );
}

function createItemDetailEmbed(item) {
    const embed = new EmbedBuilder()
        .setTitle(`📦 ${item.name}`)
        .setColor(PS99_COLORS.purple)
        .setDescription(item.description || 'No description')
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    const date = new Date(item.purchasedAt || item.wonAt || item.grantedAt);
    const sourceText = item.source === 'shop' ? 'Purchased from Shop' : item.source === 'raffle' ? 'Won from Raffle' : 'Granted by Admin';
    
    embed.addFields(
        { name: '📅 Obtained', value: date.toLocaleString(), inline: true },
        { name: '📍 Source', value: sourceText, inline: true }
    );
    
    if (item.price) {
        embed.addFields({ name: '💰 Original Price', value: `\`${item.price.toLocaleString()}\` gems`, inline: true });
    }
    
    if (item.image) {
        embed.setImage(item.image);
    }
    
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory')
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View your inventory')
                .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')))
        .addSubcommand(sub =>
            sub.setName('item')
                .setDescription('View details of an item')
                .addIntegerOption(opt => opt.setName('number').setDescription('Item number from inventory list').setRequired(true).setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('gift')
                .setDescription('Gift an item to another user')
                .addIntegerOption(opt => opt.setName('number').setDescription('Item number to gift').setRequired(true).setMinValue(1))
                .addUserOption(opt => opt.setName('user').setDescription('User to gift to').setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'view') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const items = db.getInventory(targetUser.id);
            
            const embed = createInventoryEmbed(targetUser, items, 0);
            const totalPages = Math.ceil(items.length / 10) || 1;
            
            await interaction.reply({
                embeds: [embed],
                components: items.length > 0 ? [createInventoryButtons(0, totalPages)] : []
            });
            
        } else if (subcommand === 'item') {
            const itemNumber = interaction.options.getInteger('number');
            const items = db.getInventory(interaction.user.id);
            
            if (itemNumber > items.length || itemNumber < 1) {
                return interaction.reply({ embeds: [createErrorEmbed('Invalid item number!')], ephemeral: true });
            }
            
            const item = items[itemNumber - 1];
            
            await interaction.reply({
                embeds: [createItemDetailEmbed(item)],
                ephemeral: true
            });
            
        } else if (subcommand === 'gift') {
            const itemNumber = interaction.options.getInteger('number');
            const targetUser = interaction.options.getUser('user');
            
            if (targetUser.id === interaction.user.id) {
                return interaction.reply({ embeds: [createErrorEmbed('You cannot gift items to yourself!')], ephemeral: true });
            }
            
            if (targetUser.bot) {
                return interaction.reply({ embeds: [createErrorEmbed('You cannot gift items to bots!')], ephemeral: true });
            }
            
            const items = db.getInventory(interaction.user.id);
            
            if (itemNumber > items.length || itemNumber < 1) {
                return interaction.reply({ embeds: [createErrorEmbed('Invalid item number!')], ephemeral: true });
            }
            
            const item = items[itemNumber - 1];
            
            db.removeFromInventory(interaction.user.id, item.inventoryId);
            db.addItemToInventory(targetUser.id, {
                ...item,
                giftedBy: interaction.user.username,
                giftedAt: Date.now(),
                source: 'gift'
            });
            
            db.addLog({
                type: 'inventory_gift',
                userId: interaction.user.id,
                username: interaction.user.username,
                targetId: targetUser.id,
                targetUsername: targetUser.username,
                item: item.name
            });
            
            await interaction.reply({
                embeds: [createSuccessEmbed('Item Gifted!', `You gifted **${item.name}** to ${targetUser}!`)]
            });
        }
    }
};

module.exports.createInventoryEmbed = createInventoryEmbed;
module.exports.createInventoryButtons = createInventoryButtons;
