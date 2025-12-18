const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('doubleornothing')
        .setDescription('Double your bet or lose it all!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('doubleornothing');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Double or Nothing is currently disabled!')], ephemeral: true });
        }

        const bet = interaction.options.getInteger('bet');
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        if (activeGames.has(interaction.user.id)) {
            return interaction.reply({ embeds: [createErrorEmbed('You already have an active game!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const rtp = settings.rtp || 0.95;
        const gameState = {
            bet,
            currentAmount: bet,
            rounds: 0,
            rtp
        };

        activeGames.set(interaction.user.id, gameState);

        const embed = createDoubleEmbed(gameState);
        const buttons = createDoubleButtons();

        await interaction.reply({ embeds: [embed], components: buttons });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && i.customId.startsWith('double_'),
            time: 60000
        });

        collector.on('collect', async (i) => {
            const game = activeGames.get(i.user.id);
            if (!game) return;

            if (i.customId === 'double_take') {
                activeGames.delete(i.user.id);
                collector.stop('take');

                db.addBalance(i.user.id, game.currentAmount);
                db.recordGame(i.user.id, true, game.bet, game.currentAmount);
                db.addHouseProfit(game.bet - game.currentAmount);

                const multiplier = game.currentAmount / game.bet;
                const embed = createWinEmbed('Double or Nothing', game.currentAmount, multiplier, 
                    `💰 You took your winnings after **${game.rounds}** successful doubles!`);
                await i.update({ embeds: [embed], components: [] });
                return;
            }

            if (i.customId === 'double_double') {
                const winChance = game.rtp * 0.5;
                const won = Math.random() < winChance;

                if (won) {
                    game.currentAmount *= 2;
                    game.rounds++;

                    if (game.rounds >= 10) {
                        activeGames.delete(i.user.id);
                        collector.stop('maxRounds');

                        db.addBalance(i.user.id, game.currentAmount);
                        db.recordGame(i.user.id, true, game.bet, game.currentAmount);
                        db.addHouseProfit(game.bet - game.currentAmount);

                        const multiplier = game.currentAmount / game.bet;
                        await sendBigWinNotification(client, i.user.id, i.user.username, 'Double or Nothing', game.currentAmount, multiplier);

                        const embed = createWinEmbed('Double or Nothing', game.currentAmount, multiplier, 
                            `🎉 MAXIMUM DOUBLES! You doubled **10** times!`);
                        await i.update({ embeds: [embed], components: [] });
                    } else {
                        const embed = createDoubleEmbed(game, true);
                        await i.update({ embeds: [embed], components: createDoubleButtons() });
                    }
                } else {
                    activeGames.delete(i.user.id);
                    collector.stop('lost');
                    db.recordGame(i.user.id, false, game.bet, 0);
                    db.addHouseProfit(game.bet);

                    const embed = createLoseEmbed('Double or Nothing', game.bet, 
                        `💀 You lost on round **${game.rounds + 1}**!\n\nPotential winnings lost: \`${game.currentAmount.toLocaleString()}\` gems`);
                    await i.update({ embeds: [embed], components: [] });
                }
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                const game = activeGames.get(interaction.user.id);
                if (game) {
                    activeGames.delete(interaction.user.id);
                    db.addBalance(interaction.user.id, game.currentAmount);
                    db.recordGame(interaction.user.id, true, game.bet, game.currentAmount);
                }
            }
        });
    }
};

function createDoubleButtons() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('double_double')
            .setLabel('🎲 DOUBLE')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('double_take')
            .setLabel('💰 TAKE')
            .setStyle(ButtonStyle.Success)
    )];
}

function createDoubleEmbed(game, justWon = false) {
    const multiplier = game.currentAmount / game.bet;
    let description = `\`\`\`\n╭─────────────────────────────╮\n│    2️⃣ DOUBLE OR NOTHING 2️⃣    │\n╰─────────────────────────────╯\`\`\`\n\n`;

    if (justWon) {
        description += `✅ **DOUBLED!**\n\n`;
    }

    description += `💎 **Initial Bet:** \`${game.bet.toLocaleString()}\` gems\n`;
    description += `💰 **Current Amount:** \`${game.currentAmount.toLocaleString()}\` gems\n`;
    description += `📈 **Multiplier:** \`${multiplier}x\`\n`;
    description += `🔄 **Rounds Won:** \`${game.rounds}\`\n\n`;
    description += `*Press DOUBLE to risk it all, or TAKE to secure your winnings!*`;

    return createGameEmbed({
        game: 'doubleornothing',
        title: '2️⃣ DOUBLE OR NOTHING 2️⃣',
        description: description,
        color: justWon ? PS99_COLORS.success : PS99_COLORS.gold,
        bet: game.bet
    });
}
