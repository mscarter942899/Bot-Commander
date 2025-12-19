const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createPS99Embed } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

function createRaffleEmbed(raffle, status = 'active') {
    const participants = Object.keys(raffle.participants).length;
    const timeLeft = Math.max(0, raffle.endTime - Date.now());
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    let color = PS99_COLORS.purple;
    let title = '🎟️ ═══ ACTIVE RAFFLE ═══ 🎟️';
    
    if (status === 'ended') {
        color = PS99_COLORS.gold;
        title = '🎉 ═══ RAFFLE ENDED ═══ 🎉';
    } else if (status === 'cancelled') {
        color = PS99_COLORS.error;
        title = '❌ ═══ RAFFLE CANCELLED ═══ ❌';
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setDescription(`🏆 **Prize:** \`${raffle.prize.toLocaleString()}\` gems\n\n🎫 **Total Tickets:** ${raffle.totalTickets}\n👥 **Participants:** ${participants}`)
        .addFields(
            { name: '💰 Ticket Cost', value: `\`${raffle.ticketCost.toLocaleString()}\` gems`, inline: true },
            { name: '🏆 Winners', value: `${raffle.winnersCount}`, inline: true },
            { name: '⏰ Time Left', value: status === 'active' ? `${minutes}m ${seconds}s` : 'Ended', inline: true }
        )
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    if (raffle.maxTickets) {
        embed.addFields({ name: '📊 Max Tickets', value: `${raffle.totalTickets}/${raffle.maxTickets}`, inline: true });
    }
    
    const topParticipants = Object.entries(raffle.participants)
        .sort((a, b) => b[1].tickets - a[1].tickets)
        .slice(0, 5)
        .map(([id, data], i) => {
            const chance = ((data.tickets / raffle.totalTickets) * 100).toFixed(1);
            return `${i + 1}. ${data.username}: ${data.tickets} tickets (${chance}%)`;
        })
        .join('\n');
    
    if (topParticipants) {
        embed.addFields({ name: '🎯 Top Entries', value: topParticipants, inline: false });
    }
    
    return embed;
}

function createRaffleButtons(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('raffle_join_1')
            .setLabel('🎟️ Buy 1')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('raffle_join_5')
            .setLabel('🎟️ Buy 5')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('raffle_join_10')
            .setLabel('🎟️ Buy 10')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('raffle_view')
            .setLabel('👀 View')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );
}

function createWinnersEmbed(winners, raffle) {
    const prizePerWinner = Math.floor(raffle.prize / winners.length);
    
    let winnersText = '';
    winners.forEach((winner, i) => {
        winnersText += `🏆 **${i + 1}.** <@${winner.userId}> - Won \`${prizePerWinner.toLocaleString()}\` gems!\n`;
        db.addBalance(winner.userId, prizePerWinner);
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🎉🎊 RAFFLE WINNERS 🎊🎉')
        .setColor(PS99_COLORS.gold)
        .setDescription(`**Total Prize:** \`${raffle.prize.toLocaleString()}\` gems\n**Total Tickets:** ${raffle.totalTickets}\n\n${winnersText}`)
        .setFooter({ text: '💎 Congratulations! 💎' })
        .setTimestamp();
    
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raffle')
        .setDescription('Raffle commands')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a new raffle (Admin only)')
                .addStringOption(opt => opt.setName('prize').setDescription('Prize amount (e.g., "1000", "5m", "2.5b")').setRequired(true))
                .addStringOption(opt => opt.setName('cost').setDescription('Ticket cost (e.g., "1000", "5m", "2.5b")').setRequired(true))
                .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(1440))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(false).setMinValue(1).setMaxValue(10))
                .addIntegerOption(opt => opt.setName('maxtickets').setDescription('Maximum total tickets').setRequired(false).setMinValue(10)))
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End the current raffle (Admin only)'))
        .addSubcommand(sub =>
            sub.setName('cancel')
                .setDescription('Cancel and refund the current raffle (Admin only)'))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View the current raffle'))
        .addSubcommand(sub =>
            sub.setName('history')
                .setDescription('View raffle history')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'start') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            if (db.getRaffle()) {
                return interaction.reply({ embeds: [createErrorEmbed('There is already an active raffle!')], ephemeral: true });
            }
            
            const prize = parseGemAmount(interaction.options.getString('prize'));
            const cost = parseGemAmount(interaction.options.getString('cost'));
            const duration = interaction.options.getInteger('duration') * 60000;
            
            if (prize <= 0 || cost <= 0) {
                return interaction.reply({ embeds: [createErrorEmbed('Please enter valid amounts!')], ephemeral: true });
            }
            const winners = interaction.options.getInteger('winners') || 1;
            const maxTickets = interaction.options.getInteger('maxtickets') || null;
            
            const raffle = db.createRaffle(interaction.user.id, prize, cost, maxTickets, winners, duration);
            
            db.addLog({
                type: 'raffle_start',
                userId: interaction.user.id,
                username: interaction.user.username,
                prize: prize,
                cost: cost,
                duration: duration / 60000
            });
            
            await interaction.reply({
                embeds: [createRaffleEmbed(raffle, 'active')],
                components: [createRaffleButtons(false)]
            });
            
        } else if (subcommand === 'end') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            const result = db.endRaffle();
            if (!result) {
                return interaction.reply({ embeds: [createErrorEmbed('No active raffle!')], ephemeral: true });
            }
            
            if (result.winners.length === 0) {
                return interaction.reply({ embeds: [createPS99Embed({ title: '🎟️ Raffle Ended', description: 'No participants in the raffle!', color: PS99_COLORS.info })] });
            }
            
            db.addLog({
                type: 'raffle_end',
                winners: result.winners.map(w => w.username),
                prize: result.raffle.prize,
                totalTickets: result.raffle.totalTickets
            });
            
            await interaction.reply({ embeds: [createWinnersEmbed(result.winners, result.raffle)] });
            
        } else if (subcommand === 'cancel') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ embeds: [createErrorEmbed('You need Administrator permissions!')], ephemeral: true });
            }
            
            const raffle = db.cancelRaffle();
            if (!raffle) {
                return interaction.reply({ embeds: [createErrorEmbed('No active raffle!')], ephemeral: true });
            }
            
            db.addLog({
                type: 'raffle_cancel',
                userId: interaction.user.id,
                refunded: Object.keys(raffle.participants).length
            });
            
            await interaction.reply({
                embeds: [createPS99Embed({
                    title: '❌ Raffle Cancelled',
                    description: 'The raffle has been cancelled and all participants have been refunded!',
                    color: PS99_COLORS.error
                })]
            });
            
        } else if (subcommand === 'view') {
            const raffle = db.getRaffle();
            if (!raffle) {
                return interaction.reply({ embeds: [createErrorEmbed('No active raffle!')], ephemeral: true });
            }
            
            await interaction.reply({
                embeds: [createRaffleEmbed(raffle, 'active')],
                components: [createRaffleButtons(false)]
            });
            
        } else if (subcommand === 'history') {
            const history = db.getRaffleHistory();
            
            if (history.length === 0) {
                return interaction.reply({ embeds: [createPS99Embed({ title: '📜 Raffle History', description: 'No raffle history yet!', color: PS99_COLORS.info })] });
            }
            
            const historyText = history.slice(-10).reverse().map((r, i) => {
                const date = new Date(r.endedAt).toLocaleDateString();
                const winners = r.winners.map(w => w.username).join(', ');
                return `**${i + 1}.** ${date} - Prize: \`${r.prize.toLocaleString()}\` - Winners: ${winners}`;
            }).join('\n');
            
            await interaction.reply({
                embeds: [createPS99Embed({
                    title: '📜 Raffle History',
                    description: historyText,
                    color: PS99_COLORS.purple
                })]
            });
        }
    }
};

module.exports.createRaffleEmbed = createRaffleEmbed;
module.exports.createRaffleButtons = createRaffleButtons;
