const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

const SCRATCH_PRIZES = [
    { symbol: '💎', multiplier: 10, weight: 5 },
    { symbol: '⭐', multiplier: 5, weight: 10 },
    { symbol: '🔥', multiplier: 3, weight: 15 },
    { symbol: '🍀', multiplier: 2, weight: 20 },
    { symbol: '🪙', multiplier: 1.5, weight: 25 },
    { symbol: '❌', multiplier: 0, weight: 25 }
];

function generateScratchCard(rtp) {
    const card = [];
    for (let i = 0; i < 9; i++) {
        const adjustedPrizes = SCRATCH_PRIZES.map(p => ({
            ...p,
            weight: p.multiplier === 0 ? p.weight * (1.5 - rtp) : p.weight * rtp
        }));
        
        const totalWeight = adjustedPrizes.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const prize of adjustedPrizes) {
            random -= prize.weight;
            if (random <= 0) {
                card.push(prize);
                break;
            }
        }
    }
    return card;
}

function checkWin(card) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    let bestMultiplier = 0;
    let winningSymbol = null;
    
    for (const line of lines) {
        const symbols = line.map(i => card[i].symbol);
        if (symbols[0] === symbols[1] && symbols[1] === symbols[2] && symbols[0] !== '❌') {
            if (card[line[0]].multiplier > bestMultiplier) {
                bestMultiplier = card[line[0]].multiplier;
                winningSymbol = card[line[0]].symbol;
            }
        }
    }
    
    return { multiplier: bestMultiplier, symbol: winningSymbol };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scratcher')
        .setDescription('Buy a scratch card!')
        .addStringOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet (e.g., 1000, 2.5m, 1b)')
                .setRequired(true)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('scratcher');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Scratcher is currently disabled!')], ephemeral: true });
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

        const rtp = settings.rtp || 0.90;
        const card = generateScratchCard(rtp);
        const result = checkWin(card);
        const winnings = Math.floor(bet * result.multiplier);

        const cardDisplay = [
            `${card[0].symbol} ${card[1].symbol} ${card[2].symbol}`,
            `${card[3].symbol} ${card[4].symbol} ${card[5].symbol}`,
            `${card[6].symbol} ${card[7].symbol} ${card[8].symbol}`
        ].join('\n');

        const scratchEmbed = createGameEmbed({
            game: 'scratcher',
            title: '🎫 SCRATCH CARD 🎫',
            description: `\`\`\`\n╭─────────────────────────────╮\n│     🎫 SCRATCHING... 🎫     │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n\n🔲 🔲 🔲\n🔲 🔲 🔲\n🔲 🔲 🔲`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [scratchEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (winnings > 0) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (result.multiplier >= 5) {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Scratcher', winnings, result.multiplier);
            }

            const embed = createWinEmbed('Scratcher', winnings, result.multiplier, 
                `\`\`\`\n${cardDisplay}\n\`\`\`\n\n🎉 Three **${result.symbol}** in a row!`);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Scratcher', bet, 
                `\`\`\`\n${cardDisplay}\n\`\`\`\n\n😔 No matching symbols in a row!`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
