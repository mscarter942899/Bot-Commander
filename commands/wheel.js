const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

const WHEEL_SEGMENTS = [
    { label: '💎 2x', multiplier: 2, weight: 30 },
    { label: '⭐ 1.5x', multiplier: 1.5, weight: 35 },
    { label: '🔥 3x', multiplier: 3, weight: 15 },
    { label: '💀 0x', multiplier: 0, weight: 10 },
    { label: '👑 5x', multiplier: 5, weight: 7 },
    { label: '🌈 10x', multiplier: 10, weight: 3 }
];

function spinWheel(rtp) {
    const adjustedSegments = WHEEL_SEGMENTS.map(seg => ({
        ...seg,
        weight: seg.multiplier === 0 ? seg.weight * (1.5 - rtp) : seg.weight * rtp
    }));
    
    const totalWeight = adjustedSegments.reduce((sum, seg) => sum + seg.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const segment of adjustedSegments) {
        random -= segment.weight;
        if (random <= 0) return segment;
    }
    return adjustedSegments[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wheel')
        .setDescription('Spin the prize wheel!')
        .addStringOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet (e.g., 1000, 2.5m, 1b)')
                .setRequired(true)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('wheel');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Wheel is currently disabled!')], ephemeral: true });
        }

        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const spinEmbed = createGameEmbed({
            game: 'wheel',
            title: '🎡 WHEEL OF FORTUNE 🎡',
            description: `\`\`\`\n╭─────────────────────────────╮\n│      🎡 SPINNING... 🎡      │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n\n🔄 The wheel is spinning...`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [spinEmbed] });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const rtp = settings.rtp || 0.92;
        const result = spinWheel(rtp);
        const winnings = Math.floor(bet * result.multiplier);

        if (winnings > 0) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Wheel', winnings, result.multiplier);

            const embed = createWinEmbed('Wheel', winnings, result.multiplier, 
                `🎡 The wheel landed on: **${result.label}**`);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Wheel', bet, 
                `🎡 The wheel landed on: **${result.label}**\n\n💀 Better luck next time!`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
