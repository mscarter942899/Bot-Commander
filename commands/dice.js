const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function getDiceEmoji(value) {
    return DICE_EMOJIS[value - 1];
}

function calculatePayout(betType, betValue, dice1, dice2) {
    const total = dice1 + dice2;
    const isDouble = dice1 === dice2;
    
    switch (betType) {
        case 'high':
            return total >= 8 ? 2 : 0;
        case 'low':
            return total <= 6 ? 2 : 0;
        case 'seven':
            return total === 7 ? 4 : 0;
        case 'even':
            return total % 2 === 0 ? 2 : 0;
        case 'odd':
            return total % 2 === 1 ? 2 : 0;
        case 'doubles':
            return isDouble ? 6 : 0;
        case 'exact':
            return total === parseInt(betValue) ? getExactPayout(parseInt(betValue)) : 0;
        default:
            return 0;
    }
}

function getExactPayout(target) {
    const payouts = {
        2: 36, 3: 18, 4: 12, 5: 9, 6: 7,
        7: 6, 8: 7, 9: 9, 10: 12, 11: 18, 12: 36
    };
    return payouts[target] || 0;
}

function createDiceEmbed(bet, betType, betValue, dice1 = null, dice2 = null, rolling = true) {
    const embed = new EmbedBuilder()
        .setTitle('🎲 ═══ DICE ═══ 🎲')
        .setColor(PS99_COLORS.orange)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    let betDisplay = betType.charAt(0).toUpperCase() + betType.slice(1);
    if (betType === 'exact') betDisplay = `Exact ${betValue}`;
    
    let description = `**Bet:** \`${bet.toLocaleString()}\` gems on **${betDisplay}**\n\n`;
    
    if (rolling) {
        description += `🎲 **Rolling the dice...**\n\n`;
        description += `\`\`\`\n   🎲  🎲\n\`\`\``;
    } else {
        const total = dice1 + dice2;
        const isDouble = dice1 === dice2;
        
        description += `${getDiceEmoji(dice1)} ${getDiceEmoji(dice2)}\n\n`;
        description += `**Result:** ${dice1} + ${dice2} = **${total}**`;
        if (isDouble) description += ` (DOUBLES!)`;
        description += `\n\n`;
        
        const payout = calculatePayout(betType, betValue, dice1, dice2);
        const winAmount = bet * payout;
        
        if (payout > 0) {
            description += `🎉 **YOU WIN!** Won \`${winAmount.toLocaleString()}\` gems (${payout}x)`;
            embed.setColor(PS99_COLORS.success);
        } else {
            description += `😢 **YOU LOSE** Lost \`${bet.toLocaleString()}\` gems`;
            embed.setColor(PS99_COLORS.error);
        }
    }
    
    embed.setDescription(description);
    return embed;
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`dice_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll the dice!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of bet')
                .setRequired(true)
                .addChoices(
                    { name: '📈 High (8-12) - 2x', value: 'high' },
                    { name: '📉 Low (2-6) - 2x', value: 'low' },
                    { name: '7️⃣ Seven - 4x', value: 'seven' },
                    { name: '🔢 Even - 2x', value: 'even' },
                    { name: '🔢 Odd - 2x', value: 'odd' },
                    { name: '🎯 Doubles - 6x', value: 'doubles' }
                ))
        .addIntegerOption(option =>
            option.setName('exact')
                .setDescription('Bet on exact total (2-12, overrides type)')
                .setMinValue(2)
                .setMaxValue(12)),
    
    async execute(interaction) {
        const settings = db.getGameSettings('dice');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Dice is currently disabled!')], ephemeral: true });
        }
        
        const bet = interaction.options.getInteger('bet');
        let betType = interaction.options.getString('type');
        const exactValue = interaction.options.getInteger('exact');
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
        
        const finalBetType = exactValue !== null ? 'exact' : betType;
        const finalBetValue = exactValue !== null ? exactValue : null;
        
        await interaction.reply({
            embeds: [createDiceEmbed(bet, finalBetType, finalBetValue, null, null, true)]
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const dice1 = rollDice();
        const dice2 = rollDice();
        
        const payout = calculatePayout(finalBetType, finalBetValue, dice1, dice2);
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
            type: 'dice',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet: bet,
            betType: finalBetType,
            dice: [dice1, dice2],
            total: dice1 + dice2,
            won: payout > 0,
            winAmount: winAmount
        });
        
        await interaction.editReply({
            embeds: [createDiceEmbed(bet, finalBetType, finalBetValue, dice1, dice2, false)],
            components: [createPlayAgainButton(bet)]
        });
    }
};
