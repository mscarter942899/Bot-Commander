const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

const activeGames = new Map();

function getRandomCard() {
    return Math.floor(Math.random() * 13) + 1;
}

function cardToString(value) {
    if (value === 1) return 'A';
    if (value === 11) return 'J';
    if (value === 12) return 'Q';
    if (value === 13) return 'K';
    return value.toString();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hilostreak')
        .setDescription('Guess higher or lower and build a streak!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('hilostreak');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Hi-Lo Streak is currently disabled!')], ephemeral: true });
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

        if (activeGames.has(interaction.user.id)) {
            return interaction.reply({ embeds: [createErrorEmbed('You already have an active Hi-Lo Streak game!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const currentCard = getRandomCard();
        const gameState = {
            bet,
            currentCard,
            streak: 0,
            multiplier: 1
        };

        activeGames.set(interaction.user.id, gameState);

        const embed = createHiLoEmbed(gameState);
        const buttons = createHiLoButtons();

        await interaction.reply({ embeds: [embed], components: buttons });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && i.customId.startsWith('hilo_'),
            time: 60000
        });

        collector.on('collect', async (i) => {
            const game = activeGames.get(i.user.id);
            if (!game) return;

            if (i.customId === 'hilo_cashout') {
                activeGames.delete(i.user.id);
                collector.stop('cashout');

                const winnings = Math.floor(game.bet * game.multiplier);
                db.addBalance(i.user.id, winnings);
                db.recordGame(i.user.id, true, game.bet, winnings);
                db.addHouseProfit(game.bet - winnings);

                const embed = createWinEmbed('Hi-Lo Streak', winnings, game.multiplier, 
                    `🔥 You cashed out with a **${game.streak}** win streak!`);
                await i.update({ embeds: [embed], components: [] });
                return;
            }

            const guess = i.customId === 'hilo_higher' ? 'higher' : 'lower';
            const nextCard = getRandomCard();
            const isHigher = nextCard > game.currentCard;
            const isLower = nextCard < game.currentCard;
            const isTie = nextCard === game.currentCard;
            
            const won = (guess === 'higher' && isHigher) || (guess === 'lower' && isLower) || isTie;

            if (won) {
                game.currentCard = nextCard;
                game.streak++;
                game.multiplier = 1 + (game.streak * 0.5);

                if (game.streak >= 10) {
                    activeGames.delete(i.user.id);
                    collector.stop('maxStreak');

                    const winnings = Math.floor(game.bet * game.multiplier);
                    db.addBalance(i.user.id, winnings);
                    db.recordGame(i.user.id, true, game.bet, winnings);
                    db.addHouseProfit(game.bet - winnings);

                    await sendBigWinNotification(client, i.user.id, i.user.username, 'Hi-Lo Streak', winnings, game.multiplier);

                    const embed = createWinEmbed('Hi-Lo Streak', winnings, game.multiplier, 
                        `🔥 MAXIMUM STREAK! You guessed **${game.streak}** correctly!`);
                    await i.update({ embeds: [embed], components: [] });
                } else {
                    const embed = createHiLoEmbed(game, nextCard, guess, isTie ? 'tie' : 'correct');
                    const buttons = createHiLoButtons(true);
                    await i.update({ embeds: [embed], components: buttons });
                }
            } else {
                activeGames.delete(i.user.id);
                collector.stop('wrong');
                db.recordGame(i.user.id, false, game.bet, 0);
                db.addHouseProfit(game.bet);

                const embed = createLoseEmbed('Hi-Lo Streak', game.bet, 
                    `📊 Previous: **${cardToString(game.currentCard)}** → Next: **${cardToString(nextCard)}**\n\n❌ You guessed **${guess}** but it was **${isHigher ? 'higher' : 'lower'}**!\n🔥 Streak: **${game.streak}**`);
                await i.update({ embeds: [embed], components: [] });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                const game = activeGames.get(interaction.user.id);
                if (game) {
                    activeGames.delete(interaction.user.id);
                    if (game.streak > 0) {
                        const winnings = Math.floor(game.bet * game.multiplier);
                        db.addBalance(interaction.user.id, winnings);
                        db.recordGame(interaction.user.id, true, game.bet, winnings);
                    } else {
                        db.recordGame(interaction.user.id, false, game.bet, 0);
                        db.addHouseProfit(game.bet);
                    }
                }
            }
        });
    }
};

function createHiLoButtons(showCashout = false) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('hilo_higher')
            .setLabel('⬆️ Higher')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('hilo_lower')
            .setLabel('⬇️ Lower')
            .setStyle(ButtonStyle.Primary)
    );

    if (showCashout) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('hilo_cashout')
                .setLabel('💰 Cash Out')
                .setStyle(ButtonStyle.Success)
        );
    }

    return [row];
}

function createHiLoEmbed(game, lastCard = null, guess = null, result = null) {
    let description = `\`\`\`\n╭─────────────────────────────╮\n│     📊 HI-LO STREAK 📊     │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${game.bet.toLocaleString()}\` gems\n🔥 **Streak:** \`${game.streak}\`\n📈 **Multiplier:** \`${game.multiplier.toFixed(2)}x\`\n\n`;

    if (lastCard && result) {
        description += `📊 Previous: **${cardToString(game.currentCard)}** → Was: **${result === 'tie' ? 'Same!' : (guess === 'higher' ? 'Higher ⬆️' : 'Lower ⬇️')}** ✅\n\n`;
    }

    description += `🃏 **Current Card:** \`${cardToString(game.currentCard)}\`\n\n*Will the next card be higher or lower?*`;

    return createGameEmbed({
        game: 'hilostreak',
        title: '📊 HI-LO STREAK 📊',
        description: description,
        color: PS99_COLORS.purple,
        bet: game.bet
    });
}
