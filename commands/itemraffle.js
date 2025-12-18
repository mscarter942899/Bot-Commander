const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createPS99Embed } = require('../utils/embedBuilder');

function parseDuration(durationStr) {
    const regex = /^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)$/i;
    const match = durationStr.match(regex);
    
    if (!match) {
        const mins = parseInt(durationStr);
        if (!isNaN(mins)) return mins * 60000;
        return null;
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
        case 's': case 'sec': case 'second': case 'seconds':
            return value * 1000;
        case 'm': case 'min': case 'minute': case 'minutes':
            return value * 60000;
        case 'h': case 'hr': case 'hour': case 'hours':
            return value * 3600000;
        case 'd': case 'day': case 'days':
            return value * 86400000;
        case 'w': case 'week': case 'weeks':
            return value * 604800000;
        default:
            return null;
    }
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function createItemRaffleEmbed(raffle, status = 'active') {
    const participants = Object.keys(raffle.participants).length;
    const timeLeft = Math.max(0, raffle.endTime - Date.now());
    
    let color = PS99_COLORS.pink;
    let title = '🎁 ═══ ITEM RAFFLE ═══ 🎁';
    
    if (status === 'ended') {
        color = PS99_COLORS.gold;
        title = '🎉 ═══ ITEM RAFFLE ENDED ═══ 🎉';
    } else if (status === 'cancelled') {
        color = PS99_COLORS.error;
        title = '❌ ═══ ITEM RAFFLE CANCELLED ═══ ❌';
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    let description = `🎁 **Prize:** ${raffle.prize.name}\n`;
    if (raffle.prize.description) {
        description += `📝 *${raffle.prize.description}*\n`;
    }
    description += `\n🎫 **Total Tickets:** ${raffle.totalTickets}\n`;
    description += `👥 **Participants:** ${participants}\n`;
    
    embed.setDescription(description);
    
    embed.addFields(
        { name: '💰 Ticket Cost', value: `\`${raffle.ticketCost.toLocaleString()}\` gems`, inline: true },
        { name: '🏆 Winners', value: `${raffle.winnersCount}`, inline: true },
        { name: '⏰ Time Left', value: status === 'active' ? formatDuration(timeLeft) : 'Ended', inline: true }
    );
    
    if (raffle.maxTickets) {
        embed.addFields({ name: '📊 Max Tickets', value: `${raffle.totalTickets}/${raffle.maxTickets}`, inline: true });
    }
    
    if (raffle.prize.image) {
        embed.setImage(raffle.prize.image);
    }
    
    const topParticipants = Object.entries(raffle.participants)
        .sort((a, b) => b[1].tickets - a[1].tickets)
        .slice(0, 5)
        .map(([id, data], i) => {
            const chance = raffle.totalTickets > 0 ? ((data.tickets / raffle.totalTickets) * 100).toFixed(1) : 0;
            return `${i + 1}. ${data.username}: ${data.tickets} tickets (${chance}%)`;
        })
        .join('\n');
    
    if (topParticipants) {
        embed.addFields({ name: '🎯 Top Entries', value: topParticipants, inline: false });
    }
    
    return embed;
}

function createItemRaffleButtons(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('itemraffle_join_1')
            .setLabel('🎟️ Buy 1')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('itemraffle_join_5')
            .setLabel('🎟️ Buy 5')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('itemraffle_join_10')
            .setLabel('🎟️ Buy 10')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('itemraffle_view')
            .setLabel('👀 View')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );
}

function createWinnersEmbed(winners, raffle) {
    let winnersText = '';
    winners.forEach((winner, i) => {
        winnersText += `🏆 **${i + 1}.** <@${winner.userId}> won **${raffle.prize.name}**!\n`;
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🎉🎊 ITEM RAFFLE WINNERS 🎊🎉')
        .setColor(PS99_COLORS.gold)
        .setDescription(`**Prize:** ${raffle.prize.name}\n**Total Tickets:** ${raffle.totalTickets}\n\n${winnersText}`)
        .setFooter({ text: '💎 Congratulations! 💎' })
        .setTimestamp();
    
    if (raffle.prize.image) {
        embed.setThumbnail(raffle.prize.image);
    }
    
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('itemraffle')
        .setDescription('Item raffle commands')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a new item raffle (Admin only)')
                .addStringOption(opt => opt.setName('item').setDescription('Prize item name').setRequired(true))
                .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g., 30m, 2h, 1d, 1w)').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('Item description'))
                .addStringOption(opt => opt.setName('image').setDescription('Image URL for the item'))
                .addIntegerOption(opt => opt.setName('maxtickets').setDescription('Maximum total tickets').setMinValue(10)))
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End the current item raffle (Admin only)'))
        .addSubcommand(sub =>
            sub.setName('cancel')
                .setDescription('Cancel and refund the current item raffle (Admin only)'))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View the current item raffle'))
        .addSubcommand(sub =>
            sub.setName('history')
                .setDescription('View item raffle history')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'start') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            if (db.getItemRaffle()) {
                return interaction.reply({ embeds: [createErrorEmbed('There is already an active item raffle!')], ephemeral: true });
            }
            
            const itemName = interaction.options.getString('item');
            const cost = interaction.options.getInteger('cost');
            const durationStr = interaction.options.getString('duration');
            const description = interaction.options.getString('description') || '';
            const image = interaction.options.getString('image') || null;
            const winners = interaction.options.getInteger('winners') || 1;
            const maxTickets = interaction.options.getInteger('maxtickets') || null;
            
            const duration = parseDuration(durationStr);
            if (!duration) {
                return interaction.reply({ embeds: [createErrorEmbed('Invalid duration format! Use formats like: 30s, 5m, 2h, 1d, 1w')], ephemeral: true });
            }
            
            const prize = {
                name: itemName,
                description: description,
                image: image
            };
            
            const raffle = db.createItemRaffle(interaction.user.id, prize, cost, maxTickets, winners, duration);
            
            db.addLog({
                type: 'itemraffle_start',
                userId: interaction.user.id,
                username: interaction.user.username,
                prize: itemName,
                cost: cost,
                duration: formatDuration(duration)
            });
            
            await interaction.reply({
                embeds: [createItemRaffleEmbed(raffle, 'active')],
                components: [createItemRaffleButtons(false)]
            });
            
        } else if (subcommand === 'end') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            const result = db.endItemRaffle();
            if (!result) {
                return interaction.reply({ embeds: [createErrorEmbed('No active item raffle!')], ephemeral: true });
            }
            
            if (result.winners.length === 0) {
                return interaction.reply({ embeds: [createPS99Embed({ title: '🎁 Item Raffle Ended', description: 'No participants in the raffle!', color: PS99_COLORS.info })] });
            }
            
            db.addLog({
                type: 'itemraffle_end',
                winners: result.winners.map(w => w.username),
                prize: result.raffle.prize.name,
                totalTickets: result.raffle.totalTickets
            });
            
            await interaction.reply({ embeds: [createWinnersEmbed(result.winners, result.raffle)] });
            
        } else if (subcommand === 'cancel') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            const raffle = db.cancelItemRaffle();
            if (!raffle) {
                return interaction.reply({ embeds: [createErrorEmbed('No active item raffle!')], ephemeral: true });
            }
            
            db.addLog({
                type: 'itemraffle_cancel',
                userId: interaction.user.id,
                refunded: Object.keys(raffle.participants).length
            });
            
            await interaction.reply({
                embeds: [createPS99Embed({
                    title: '❌ Item Raffle Cancelled',
                    description: 'The item raffle has been cancelled and all participants have been refunded!',
                    color: PS99_COLORS.error
                })]
            });
            
        } else if (subcommand === 'view') {
            const raffle = db.getItemRaffle();
            if (!raffle) {
                return interaction.reply({ embeds: [createErrorEmbed('No active item raffle!')], ephemeral: true });
            }
            
            await interaction.reply({
                embeds: [createItemRaffleEmbed(raffle, 'active')],
                components: [createItemRaffleButtons(false)]
            });
            
        } else if (subcommand === 'history') {
            const history = db.getItemRaffleHistory();
            
            if (history.length === 0) {
                return interaction.reply({ embeds: [createPS99Embed({ title: '📜 Item Raffle History', description: 'No item raffle history yet!', color: PS99_COLORS.info })] });
            }
            
            const historyText = history.slice(-10).reverse().map((r, i) => {
                const date = new Date(r.endedAt).toLocaleDateString();
                const winners = r.winners.map(w => w.username).join(', ');
                return `**${i + 1}.** ${date} - **${r.prize.name}** - Winners: ${winners}`;
            }).join('\n');
            
            await interaction.reply({
                embeds: [createPS99Embed({
                    title: '📜 Item Raffle History',
                    description: historyText,
                    color: PS99_COLORS.pink
                })]
            });
        }
    }
};

module.exports.createItemRaffleEmbed = createItemRaffleEmbed;
module.exports.createItemRaffleButtons = createItemRaffleButtons;
