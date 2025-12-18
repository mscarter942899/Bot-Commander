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

function countMatches(player, winning) {
    return player.filter(n => winning.includes(n)).length;
}

const PAYOUTS = {
    0: 0,
    1: 0,
    2: 1,
    3: 5,
    4: 50,
    5: 500,
    6: 10000
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('Play the lottery!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(opt =>
            opt.setName('numbers')
                .setDescription('Pick 6 numbers (1-49) separated by spaces, or type "quick" for quick pick')
                .setRequired(false)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('lottery');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Lottery is currently disabled!')], ephemeral: true });
        }

        const bet = interaction.options.getInteger('bet');
        const numbersInput = interaction.options.getString('numbers');
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        let playerNumbers;
        if (!numbersInput || numbersInput.toLowerCase() === 'quick') {
            playerNumbers = generateNumbers(6, 49);
        } else {
            const parsed = numbersInput.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 1 && n <= 49);
            if (parsed.length !== 6 || new Set(parsed).size !== 6) {
                return interaction.reply({ embeds: [createErrorEmbed('Please enter exactly 6 unique numbers between 1-49!')], ephemeral: true });
            }
            playerNumbers = parsed.sort((a, b) => a - b);
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const drawEmbed = createGameEmbed({
            game: 'lottery',
            title: '🎟️ LOTTERY 🎟️',
            description: `\`\`\`\n╭─────────────────────────────╮\n│      🎟️ DRAWING... 🎟️      │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n🎫 **Your Numbers:** ${playerNumbers.join(' - ')}\n\n🔮 Drawing the winning numbers...`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [drawEmbed] });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const winningNumbers = generateNumbers(6, 49);
        const matches = countMatches(playerNumbers, winningNumbers);
        const multiplier = PAYOUTS[matches] || 0;
        const winnings = Math.floor(bet * multiplier);

        const matchedDisplay = playerNumbers.map(n => winningNumbers.includes(n) ? `**[${n}]**` : n).join(' - ');

        if (winnings > 0) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (matches >= 5) {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Lottery', winnings, multiplier);
            }

            const embed = createWinEmbed('Lottery', winnings, multiplier, 
                `🎫 **Your Numbers:** ${matchedDisplay}\n🏆 **Winning Numbers:** ${winningNumbers.join(' - ')}\n\n✨ You matched **${matches}** numbers!`);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Lottery', bet, 
                `🎫 **Your Numbers:** ${matchedDisplay}\n🏆 **Winning Numbers:** ${winningNumbers.join(' - ')}\n\n😔 You only matched **${matches}** numbers.`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
