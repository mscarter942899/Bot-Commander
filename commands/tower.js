const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tower')
        .setDescription('Climb the tower and avoid traps!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(opt =>
            opt.setName('difficulty')
                .setDescription('Difficulty level')
                .setRequired(false)
                .addChoices(
                    { name: 'Easy (2 columns)', value: 'easy' },
                    { name: 'Medium (3 columns)', value: 'medium' },
                    { name: 'Hard (4 columns)', value: 'hard' }
                )),

    async execute(interaction, client) {
        const settings = db.getGameSettings('tower');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Tower is currently disabled!')], ephemeral: true });
        }

        const bet = interaction.options.getInteger('bet');
        const difficulty = interaction.options.getString('difficulty') || 'medium';
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        if (activeGames.has(interaction.user.id)) {
            return interaction.reply({ embeds: [createErrorEmbed('You already have an active Tower game!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const columns = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 4 : 3;
        const multiplierStep = difficulty === 'easy' ? 1.4 : difficulty === 'hard' ? 2.5 : 1.8;
        
        const tower = [];
        for (let i = 0; i < 8; i++) {
            const safeColumn = Math.floor(Math.random() * columns);
            tower.push(safeColumn);
        }

        const gameState = {
            bet,
            tower,
            columns,
            multiplierStep,
            currentLevel: 0,
            currentMultiplier: 1,
            revealed: []
        };

        activeGames.set(interaction.user.id, gameState);

        const buttons = createTowerButtons(columns, gameState);
        const embed = createTowerEmbed(gameState, bet);

        await interaction.reply({ embeds: [embed], components: buttons });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && i.customId.startsWith('tower_'),
            time: 60000
        });

        collector.on('collect', async (i) => {
            const game = activeGames.get(i.user.id);
            if (!game) return;

            if (i.customId === 'tower_cashout') {
                activeGames.delete(i.user.id);
                collector.stop('cashout');

                const winnings = Math.floor(game.bet * game.currentMultiplier);
                db.addBalance(i.user.id, winnings);
                db.recordGame(i.user.id, true, game.bet, winnings);
                db.addHouseProfit(game.bet - winnings);

                const embed = createWinEmbed('Tower', winnings, game.currentMultiplier, 
                    `🗼 You cashed out at level **${game.currentLevel}**!`);
                await i.update({ embeds: [embed], components: [] });
                return;
            }

            const column = parseInt(i.customId.split('_')[1]);
            const safeColumn = game.tower[game.currentLevel];

            if (column === safeColumn) {
                game.currentLevel++;
                game.currentMultiplier = Math.pow(game.multiplierStep, game.currentLevel);
                game.revealed.push({ level: game.currentLevel - 1, safe: column });

                if (game.currentLevel >= 8) {
                    activeGames.delete(i.user.id);
                    collector.stop('maxLevel');

                    const winnings = Math.floor(game.bet * game.currentMultiplier);
                    db.addBalance(i.user.id, winnings);
                    db.recordGame(i.user.id, true, game.bet, winnings);
                    db.addHouseProfit(game.bet - winnings);

                    await sendBigWinNotification(client, i.user.id, i.user.username, 'Tower', winnings, game.currentMultiplier);

                    const embed = createWinEmbed('Tower', winnings, game.currentMultiplier, 
                        `🗼 You reached the TOP of the tower!`);
                    await i.update({ embeds: [embed], components: [] });
                } else {
                    const buttons = createTowerButtons(game.columns, game);
                    const embed = createTowerEmbed(game, game.bet);
                    await i.update({ embeds: [embed], components: buttons });
                }
            } else {
                activeGames.delete(i.user.id);
                collector.stop('trap');
                db.recordGame(i.user.id, false, game.bet, 0);
                db.addHouseProfit(game.bet);

                const embed = createLoseEmbed('Tower', game.bet, 
                    `💥 You hit a trap at level **${game.currentLevel + 1}**!\n\n🗼 Safe column was: **${safeColumn + 1}**`);
                await i.update({ embeds: [embed], components: [] });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                const game = activeGames.get(interaction.user.id);
                if (game) {
                    activeGames.delete(interaction.user.id);
                    if (game.currentLevel > 0) {
                        const winnings = Math.floor(game.bet * game.currentMultiplier);
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

function createTowerButtons(columns, game) {
    const rows = [];
    
    const columnRow = new ActionRowBuilder();
    for (let i = 0; i < columns; i++) {
        columnRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`tower_${i}`)
                .setLabel(`Column ${i + 1}`)
                .setStyle(ButtonStyle.Primary)
        );
    }
    rows.push(columnRow);
    
    if (game.currentLevel > 0) {
        const cashoutRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tower_cashout')
                .setLabel(`💰 Cash Out (${game.currentMultiplier.toFixed(2)}x)`)
                .setStyle(ButtonStyle.Success)
        );
        rows.push(cashoutRow);
    }
    
    return rows;
}

function createTowerEmbed(game, bet) {
    let towerDisplay = '';
    for (let i = 7; i >= 0; i--) {
        const levelNum = i + 1;
        const mult = Math.pow(game.multiplierStep, i + 1).toFixed(2);
        if (i < game.currentLevel) {
            towerDisplay += `✅ Level ${levelNum} - ${mult}x (CLEARED)\n`;
        } else if (i === game.currentLevel) {
            towerDisplay += `➡️ Level ${levelNum} - ${mult}x (CURRENT)\n`;
        } else {
            towerDisplay += `⬜ Level ${levelNum} - ${mult}x\n`;
        }
    }

    return createGameEmbed({
        game: 'tower',
        title: '🗼 TOWER 🗼',
        description: `\`\`\`\n╭─────────────────────────────╮\n│      🗼 CLIMB THE TOWER 🗼      │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n📊 **Current Multiplier:** \`${game.currentMultiplier.toFixed(2)}x\`\n\n${towerDisplay}\n\n*Pick a column to climb or cash out!*`,
        color: PS99_COLORS.gold,
        bet: bet
    });
}
