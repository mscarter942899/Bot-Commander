const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

const ROULETTE_NUMBERS = {
    0: 'green',
    1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
    7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
    13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
    25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

const COLOR_EMOJIS = { red: '🔴', black: '⚫', green: '🟢' };

function spinWheel() {
    return Math.floor(Math.random() * 37);
}

function getNumberColor(num) {
    return ROULETTE_NUMBERS[num];
}

function calculatePayout(betType, betValue, result) {
    const resultColor = getNumberColor(result);
    
    switch (betType) {
        case 'red':
            return resultColor === 'red' ? 2 : 0;
        case 'black':
            return resultColor === 'black' ? 2 : 0;
        case 'green':
            return result === 0 ? 36 : 0;
        case 'even':
            return result !== 0 && result % 2 === 0 ? 2 : 0;
        case 'odd':
            return result % 2 === 1 ? 2 : 0;
        case 'low':
            return result >= 1 && result <= 18 ? 2 : 0;
        case 'high':
            return result >= 19 && result <= 36 ? 2 : 0;
        case 'dozen1':
            return result >= 1 && result <= 12 ? 3 : 0;
        case 'dozen2':
            return result >= 13 && result <= 24 ? 3 : 0;
        case 'dozen3':
            return result >= 25 && result <= 36 ? 3 : 0;
        case 'number':
            return parseInt(betValue) === result ? 36 : 0;
        default:
            return 0;
    }
}

function createRouletteEmbed(bet, betType, betValue, result = null, spinning = true) {
    const embed = new EmbedBuilder()
        .setTitle('🎰 ═══ ROULETTE ═══ 🎰')
        .setColor(PS99_COLORS.gold)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    const betDisplay = betType === 'number' ? `Number ${betValue}` : betType.charAt(0).toUpperCase() + betType.slice(1);
    
    if (spinning) {
        embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems on ${betDisplay}\n\n🎡 **Spinning the wheel...**\n\n\`\`\`\n   🔴 ⚫ 🟢 ⚫ 🔴\n      ↓ ↓ ↓\n\`\`\``);
    } else {
        const color = getNumberColor(result);
        const colorEmoji = COLOR_EMOJIS[color];
        const payout = calculatePayout(betType, betValue, result);
        const winAmount = bet * payout;
        
        let resultText = payout > 0 
            ? `🎉 **YOU WIN!** 🎉\n\nWon: \`${winAmount.toLocaleString()}\` gems (${payout}x)`
            : `😢 **YOU LOSE**\n\nLost: \`${bet.toLocaleString()}\` gems`;
        
        embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems on ${betDisplay}\n\n${colorEmoji} **Result: ${result}** (${color.toUpperCase()})\n\n${resultText}`);
        embed.setColor(payout > 0 ? PS99_COLORS.success : PS99_COLORS.error);
    }
    
    return embed;
}

function createRouletteButtons(gameId, disabled = false) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`roulette_red_${gameId}`).setLabel('🔴 Red (2x)').setStyle(ButtonStyle.Danger).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`roulette_black_${gameId}`).setLabel('⚫ Black (2x)').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`roulette_green_${gameId}`).setLabel('🟢 Green (35x)').setStyle(ButtonStyle.Success).setDisabled(disabled)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`roulette_even_${gameId}`).setLabel('Even (2x)').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`roulette_odd_${gameId}`).setLabel('Odd (2x)').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`roulette_low_${gameId}`).setLabel('1-18 (2x)').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`roulette_high_${gameId}`).setLabel('19-36 (2x)').setStyle(ButtonStyle.Primary).setDisabled(disabled)
    );
    
    return [row1, row2];
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`roulette_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play Roulette!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (e.g., 1000, 2.5m, 1b)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of bet')
                .setRequired(true)
                .addChoices(
                    { name: '🔴 Red (2x)', value: 'red' },
                    { name: '⚫ Black (2x)', value: 'black' },
                    { name: '🟢 Green/0 (35x)', value: 'green' },
                    { name: 'Even (2x)', value: 'even' },
                    { name: 'Odd (2x)', value: 'odd' },
                    { name: '1-18 Low (2x)', value: 'low' },
                    { name: '19-36 High (2x)', value: 'high' },
                    { name: '1-12 First Dozen (3x)', value: 'dozen1' },
                    { name: '13-24 Second Dozen (3x)', value: 'dozen2' },
                    { name: '25-36 Third Dozen (3x)', value: 'dozen3' }
                ))
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('Specific number to bet on (0-36, overrides type)')
                .setMinValue(0)
                .setMaxValue(36)),
    
    async execute(interaction) {
        const settings = db.getGameSettings('roulette');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Roulette is currently disabled!')], ephemeral: true });
        }
        
        const betInput = interaction.options.getString('bet');
        let bet = parseGemAmount(betInput);
        const betType = interaction.options.getString('type');
        const specificNumber = interaction.options.getInteger('number');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (bet < settings.minBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Minimum bet is \`${settings.minBet.toLocaleString()}\` gems!`)], ephemeral: true });
        }
        if (bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Maximum bet is \`${settings.maxBet.toLocaleString()}\` gems!`)], ephemeral: true });
        }
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const finalBetType = specificNumber !== null ? 'number' : betType;
        const finalBetValue = specificNumber !== null ? specificNumber : null;
        
        await interaction.reply({
            embeds: [createRouletteEmbed(bet, finalBetType, finalBetValue, null, true)]
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const result = spinWheel();
        const payout = calculatePayout(finalBetType, finalBetValue, result);
        const winAmount = bet * payout;
        
        if (payout > 0) {
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);
        }
        
        db.addLog({
            type: 'roulette',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet: bet,
            betType: finalBetType,
            result: result,
            won: payout > 0,
            winAmount: winAmount
        });
        
        await interaction.editReply({
            embeds: [createRouletteEmbed(bet, finalBetType, finalBetValue, result, false)],
            components: [createPlayAgainButton(bet)]
        });
    }
};

module.exports.createRouletteEmbed = createRouletteEmbed;
module.exports.calculatePayout = calculatePayout;
module.exports.spinWheel = spinWheel;
module.exports.getNumberColor = getNumberColor;
