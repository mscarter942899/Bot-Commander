const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function calculateMultiplier(revealed, mines, gridSize) {
    if (revealed === 0) return 1;
    
    const safeTiles = gridSize - mines;
    let multiplier = 1;
    
    for (let i = 0; i < revealed; i++) {
        const remainingSafe = safeTiles - i;
        const remainingTotal = gridSize - i;
        multiplier *= remainingTotal / remainingSafe;
    }
    
    const houseEdge = 0.97;
    return Math.max(1, Math.round(multiplier * houseEdge * 100) / 100);
}

function createMinesGrid(gameId, revealed, mineField, disabled = false, showAll = false) {
    const rows = [];
    const gridSize = 4;
    
    for (let row = 0; row < gridSize; row++) {
        const actionRow = new ActionRowBuilder();
        
        for (let col = 0; col < gridSize; col++) {
            const idx = row * gridSize + col;
            const isRevealed = revealed.includes(idx);
            const isMine = mineField ? mineField[idx] : false;
            
            let style = ButtonStyle.Secondary;
            let emoji = '❓';
            let buttonDisabled = disabled;
            
            if (showAll) {
                if (isMine) {
                    style = ButtonStyle.Danger;
                    emoji = '💣';
                } else if (isRevealed) {
                    style = ButtonStyle.Success;
                    emoji = '💎';
                }
                buttonDisabled = true;
            } else if (isRevealed) {
                style = ButtonStyle.Success;
                emoji = '💎';
                buttonDisabled = true;
            }
            
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mines_tile_${gameId}_${idx}`)
                    .setEmoji(emoji)
                    .setStyle(style)
                    .setDisabled(buttonDisabled)
            );
        }
        
        rows.push(actionRow);
    }
    
    return rows;
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mines_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

function generateMineField(gridSize, mineCount) {
    const field = Array(gridSize).fill(false);
    let placed = 0;
    
    while (placed < mineCount) {
        const idx = Math.floor(Math.random() * gridSize);
        if (!field[idx]) {
            field[idx] = true;
            placed++;
        }
    }
    
    return field;
}

module.exports = {
    customId: 'mines',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        
        if (action === 'tile') {
            const gameId = `${parts[2]}_${parts[3]}`;
            const tileIdx = parseInt(parts[4]);
            const game = client.activeGames.get(gameId);
            
            if (!game) {
                return interaction.reply({ embeds: [createErrorEmbed('Game not found or expired!')], ephemeral: true });
            }
            
            if (game.userId !== interaction.user.id) {
                return interaction.reply({ embeds: [createErrorEmbed('This is not your game!')], ephemeral: true });
            }
            
            if (game.revealed.includes(tileIdx)) {
                return interaction.reply({ embeds: [createErrorEmbed('Tile already revealed!')], ephemeral: true });
            }
            
            if (game.mineField[tileIdx]) {
                db.recordGame(interaction.user.id, false, game.bet, 0);
                db.addHouseProfit(game.bet);
                
                db.addLog({
                    type: 'mines',
                    userId: interaction.user.id,
                    username: interaction.user.username,
                    bet: game.bet,
                    mines: game.mines,
                    revealed: game.revealed.length,
                    won: false
                });
                
                client.activeGames.delete(gameId);
                
                const embed = new EmbedBuilder()
                    .setTitle('💣 ═══ MINES ═══ 💣')
                    .setColor(PS99_COLORS.error)
                    .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n**Mines:** ${game.mines} 💣\n\n💥 **BOOM!** You hit a mine!\nLost \`${game.bet.toLocaleString()}\` gems`)
                    .setFooter({ text: '💎 PS99 Casino 💎' })
                    .setTimestamp();
                
                const gridRows = createMinesGrid(gameId, game.revealed, game.mineField, true, true);
                
                await interaction.update({
                    embeds: [embed],
                    components: [...gridRows]
                });
                
            } else {
                game.revealed.push(tileIdx);
                const gridSize = game.gridSize || 16;
                game.multiplier = calculateMultiplier(game.revealed.length, game.mines, gridSize);
                
                const safeTiles = gridSize - game.mines;
                
                if (game.revealed.length >= safeTiles) {
                    const winAmount = Math.floor(game.bet * game.multiplier);
                    db.addBalance(interaction.user.id, winAmount);
                    db.recordGame(interaction.user.id, true, game.bet, winAmount);
                    
                    client.activeGames.delete(gameId);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('💣 ═══ MINES ═══ 💣')
                        .setColor(PS99_COLORS.success)
                        .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n🎉 **ALL GEMS FOUND!**\n\nWon \`${winAmount.toLocaleString()}\` gems (${game.multiplier.toFixed(2)}x)!`)
                        .setFooter({ text: '💎 PS99 Casino 💎' })
                        .setTimestamp();
                    
                    const gridRows = createMinesGrid(gameId, game.revealed, game.mineField, true, true);
                    
                    await interaction.update({
                        embeds: [embed],
                        components: [...gridRows]
                    });
                } else {
                    const potentialWin = Math.floor(game.bet * game.multiplier);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('💣 ═══ MINES ═══ 💣')
                        .setColor(PS99_COLORS.gold)
                        .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n**Mines:** ${game.mines} 💣 | **Revealed:** ${game.revealed.length} 💎\n**Multiplier:** ${game.multiplier.toFixed(2)}x\n\n**Potential Win:** \`${potentialWin.toLocaleString()}\` gems`)
                        .setFooter({ text: '💎 PS99 Casino 💎' })
                        .setTimestamp();
                    
                    const gridRows = createMinesGrid(gameId, game.revealed, null, false);
                    
                    const cashoutRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`mines_cashout_${gameId}`)
                            .setLabel(`💰 Cash Out (${potentialWin.toLocaleString()} gems)`)
                            .setStyle(ButtonStyle.Success)
                    );
                    
                    await interaction.update({
                        embeds: [embed],
                        components: [...gridRows, cashoutRow]
                    });
                }
            }
            
        } else if (action === 'cashout') {
            const gameId = `${parts[2]}_${parts[3]}`;
            const game = client.activeGames.get(gameId);
            
            if (!game) {
                return interaction.reply({ embeds: [createErrorEmbed('Game not found!')], ephemeral: true });
            }
            
            if (game.userId !== interaction.user.id) {
                return interaction.reply({ embeds: [createErrorEmbed('This is not your game!')], ephemeral: true });
            }
            
            if (game.revealed.length === 0) {
                return interaction.reply({ embeds: [createErrorEmbed('Reveal at least one tile first!')], ephemeral: true });
            }
            
            const winAmount = Math.floor(game.bet * game.multiplier);
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, game.bet, winAmount);
            db.addHouseProfit(game.bet - winAmount);
            
            db.addLog({
                type: 'mines',
                userId: interaction.user.id,
                username: interaction.user.username,
                bet: game.bet,
                mines: game.mines,
                revealed: game.revealed.length,
                multiplier: game.multiplier,
                won: true,
                winAmount: winAmount
            });
            
            client.activeGames.delete(gameId);
            
            const embed = new EmbedBuilder()
                .setTitle('💣 ═══ MINES ═══ 💣')
                .setColor(PS99_COLORS.success)
                .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n🎉 **CASHED OUT!**\n\nWon \`${winAmount.toLocaleString()}\` gems (${game.multiplier.toFixed(2)}x)!`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            const gridRows = createMinesGrid(gameId, game.revealed, game.mineField, true, true);
            
            await interaction.update({
                embeds: [embed],
                components: [...gridRows]
            });
            
        } else if (action === 'again') {
            const bet = parseInt(parts[2]);
            const settings = db.getGameSettings('mines');
            
            if (!settings.enabled) {
                return interaction.reply({ embeds: [createErrorEmbed('Mines is currently disabled!')], ephemeral: true });
            }
            
            const user = db.getUser(interaction.user.id, interaction.user.username);
            
            if (user.balance < bet) {
                return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)], ephemeral: true });
            }
            
            db.removeBalance(interaction.user.id, bet);
            
            const mines = 3;
            const gridSize = 16;
            const mineField = generateMineField(gridSize, mines);
            const gameId = `${interaction.user.id}_${Date.now()}`;
            
            const gameState = {
                bet,
                mines,
                mineField,
                revealed: [],
                multiplier: 1,
                userId: interaction.user.id,
                username: interaction.user.username,
                gridSize: gridSize
            };
            
            client.activeGames.set(gameId, gameState);
            
            setTimeout(() => {
                if (client.activeGames.has(gameId)) {
                    const game = client.activeGames.get(gameId);
                    if (game.revealed.length > 0) {
                        const winAmount = Math.floor(bet * game.multiplier);
                        db.addBalance(interaction.user.id, winAmount);
                        db.recordGame(interaction.user.id, true, bet, winAmount);
                    }
                    client.activeGames.delete(gameId);
                }
            }, 600000);
            
            const embed = new EmbedBuilder()
                .setTitle('💣 ═══ MINES ═══ 💣')
                .setColor(PS99_COLORS.gold)
                .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n**Mines:** ${mines} 💣 | **Revealed:** 0 💎\n**Multiplier:** 1.00x\n\nClick tiles to reveal gems. Cash out anytime!`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            const gridRows = createMinesGrid(gameId, [], null, false);
            
            const cashoutRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`mines_cashout_${gameId}`)
                    .setLabel('💰 Cash Out (0 gems)')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true)
            );
            
            await interaction.update({
                embeds: [embed],
                components: [...gridRows, cashoutRow]
            });
        }
    }
};
