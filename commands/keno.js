const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

function generateNumbers(count, max) {
    const numbers = [];
    while (numbers.length < count) {
        const num = Math.floor(Math.random() * max) + 1;
        if (!numbers.includes(num)) numbers.push(num);
    }
    return numbers.sort((a, b) => a - b);
}

const KENO_PAYOUTS = {
    1: { 0: 0, 1: 2 },
    2: { 0: 0, 1: 1, 2: 4 },
    3: { 0: 0, 1: 0.5, 2: 2, 3: 8 },
    4: { 0: 0, 1: 0, 2: 1.5, 3: 5, 4: 15 },
    5: { 0: 0, 1: 0, 2: 1, 3: 3, 4: 10, 5: 50 },
    6: { 0: 0, 1: 0, 2: 0.5, 3: 2, 4: 6, 5: 25, 6: 100 },
    7: { 0: 0, 1: 0, 2: 0, 3: 1.5, 4: 4, 5: 15, 6: 50, 7: 200 },
    8: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 3, 5: 10, 6: 30, 7: 100, 8: 500 },
    9: { 0: 0, 1: 0, 2: 0, 3: 0.5, 4: 2, 5: 6, 6: 20, 7: 60, 8: 250, 9: 1000 },
    10: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1.5, 5: 4, 6: 15, 7: 40, 8: 150, 9: 500, 10: 2500 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('keno')
        .setDescription('Play Keno!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(opt =>
            opt.setName('numbers')
                .setDescription('Pick 1-10 numbers (1-40) separated by spaces')
                .setRequired(false)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('keno');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Keno is currently disabled!')], ephemeral: true });
        }

        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const numbersInput = interaction.options.getString('numbers');
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        let playerNumbers;
        if (!numbersInput) {
            playerNumbers = generateNumbers(5, 40);
        } else {
            const parsed = numbersInput.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 1 && n <= 40);
            if (parsed.length < 1 || parsed.length > 10 || new Set(parsed).size !== parsed.length) {
                return interaction.reply({ embeds: [createErrorEmbed('Please enter 1-10 unique numbers between 1-40!')], ephemeral: true });
            }
            playerNumbers = [...new Set(parsed)].sort((a, b) => a - b);
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const drawEmbed = createGameEmbed({
            game: 'keno',
            title: '🔢 KENO 🔢',
            description: `\`\`\`\n╭─────────────────────────────╮\n│      🔢 DRAWING... 🔢      │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n🎫 **Your Numbers (${playerNumbers.length}):** ${playerNumbers.join(', ')}\n\n🔮 Drawing 20 numbers...`,
            color: PS99_COLORS.purple,
            bet: bet
        });

        await interaction.reply({ embeds: [drawEmbed] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const drawnNumbers = generateNumbers(20, 40);
        const matches = playerNumbers.filter(n => drawnNumbers.includes(n)).length;
        const payoutTable = KENO_PAYOUTS[playerNumbers.length] || KENO_PAYOUTS[5];
        const multiplier = payoutTable[matches] || 0;
        const winnings = Math.floor(bet * multiplier);

        const matchedDisplay = playerNumbers.map(n => drawnNumbers.includes(n) ? `**[${n}]**` : n).join(', ');

        if (winnings > 0) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (multiplier >= 50) {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Keno', winnings, multiplier);
            }

            const embed = createWinEmbed('Keno', winnings, multiplier, 
                `🎫 **Your Numbers:** ${matchedDisplay}\n🏆 **Drawn:** ${drawnNumbers.slice(0, 10).join(', ')}...\n\n✨ You matched **${matches}/${playerNumbers.length}** numbers!`);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Keno', bet, 
                `🎫 **Your Numbers:** ${matchedDisplay}\n🏆 **Drawn:** ${drawnNumbers.slice(0, 10).join(', ')}...\n\n😔 You only matched **${matches}/${playerNumbers.length}** numbers.`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
