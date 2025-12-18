const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

function getRandomCard() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const valueIndex = Math.floor(Math.random() * values.length);
    return { display: `${values[valueIndex]}${suit}`, value: valueIndex + 2 };
}

function getSpread(low, high) {
    return high - low - 1;
}

function getSpreadPayout(spread) {
    if (spread === 1) return 5;
    if (spread === 2) return 4;
    if (spread === 3) return 2;
    return 1;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reddog')
        .setDescription('Play Red Dog Poker!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('reddog');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Red Dog is currently disabled!')], ephemeral: true });
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

        const dealEmbed = createGameEmbed({
            game: 'reddog',
            title: '🐕 RED DOG 🐕',
            description: `\`\`\`\n╭─────────────────────────────╮\n│     🐕 DEALING... 🐕     │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n\n🃏 Dealing cards...`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [dealEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        let card1 = getRandomCard();
        let card2 = getRandomCard();

        if (card1.value > card2.value) {
            [card1, card2] = [card2, card1];
        }

        const card3 = getRandomCard();
        const spread = getSpread(card1.value, card2.value);

        let result;
        let multiplier = 0;

        if (card1.value === card2.value) {
            if (card3.value === card1.value) {
                result = 'triple';
                multiplier = 11;
            } else {
                result = 'push';
                multiplier = 1;
            }
        } else if (spread === 0) {
            result = 'consecutive';
            multiplier = 1;
        } else {
            if (card3.value > card1.value && card3.value < card2.value) {
                result = 'win';
                multiplier = getSpreadPayout(spread);
            } else {
                result = 'lose';
                multiplier = 0;
            }
        }

        const winnings = bet * multiplier;
        const cardDisplay = `🃏 **First Card:** \`${card1.display}\`\n🃏 **Second Card:** \`${card2.display}\`\n📊 **Spread:** \`${spread}\`\n\n🎴 **Third Card:** \`${card3.display}\``;

        if (result === 'win' || result === 'triple') {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (result === 'triple') {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Red Dog', winnings, multiplier);
            }

            const embed = createWinEmbed('Red Dog', winnings, multiplier, 
                `${cardDisplay}\n\n${result === 'triple' ? '🎉 TRIPLE! Three of a kind!' : `✅ The third card fell between!`}`);
            await interaction.editReply({ embeds: [embed] });
        } else if (result === 'push' || result === 'consecutive') {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);

            const embed = createGameEmbed({
                game: 'reddog',
                title: '🐕 RED DOG - PUSH 🐕',
                description: `\`\`\`diff\n= PUSH =\`\`\`\n\n${cardDisplay}\n\n${result === 'push' ? '🤝 Pair dealt! Bet returned.' : '🤝 Consecutive cards! Bet returned.'}`,
                color: PS99_COLORS.info,
                bet: bet
            });
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Red Dog', bet, 
                `${cardDisplay}\n\n❌ The third card didn't fall between!`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
