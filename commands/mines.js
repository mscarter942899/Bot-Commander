const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

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

function createMinesEmbed(bet, mines, revealed, multiplier, status = 'playing', mineField = null, hitMine = -1) {
    const embed = new EmbedBuilder()
        .setTitle('💣 ═══ MINES ═══ 💣')
        .setColor(status === 'won' ? PS99_COLORS.success : status === 'lost' ? PS99_COLORS.error : PS99_COLORS.gold)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    let description = `**Bet:** \`${bet.toLocaleString()}\` gems\n`;
    description += `**Mines:** ${mines} 💣 | **Revealed:** ${revealed} 💎\n`;
    description += `**Multiplier:** ${multiplier.toFixed(2)}x\n\n`;
    
    if (status === 'playing') {
        const potentialWin = Math.floor(bet * multiplier);
        description += `**Potential Win:** \`${potentialWin.toLocaleString()}\` gems\n\n`;
        description += `Click tiles to reveal gems. Cash out anytime!`;
    } else if (status === 'won') {
        const winAmount = Math.floor(bet * multiplier);
        description += `\n🎉 **CASHED OUT!**\nYou won \`${winAmount.toLocaleString()}\` gems!`;
    } else if (status === 'lost') {
        description += `\n💥 **BOOM!** You hit a mine!\nLost \`${bet.toLocaleString()}\` gems`;
    }
    
    embed.setDescription(description);
    return embed;
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

function createCashoutButton(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mines_cashout_${gameId}`)
            .setLabel('💰 Cash Out')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled)
    );
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mines_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mines')
        .setDescription('Play Mines - reveal gems, avoid bombs!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10))
        .addIntegerOption(option =>
            option.setName('mines')
                .setDescription('Number of mines (1-15)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(15)),
    
    async execute(interaction, client) {
        const settings = db.getGameSettings('mines');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Mines is currently disabled!')], ephemeral: true });
        }
        
        const bet = interaction.options.getInteger('bet');
        const mines = interaction.options.getInteger('mines');
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
        
        const gridRows = createMinesGrid(gameId, [], null, false);
        
        const cashoutRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mines_cashout_${gameId}`)
                .setLabel('💰 Cash Out (0 gems)')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
        );
        
        await interaction.reply({
            embeds: [createMinesEmbed(bet, mines, 0, 1, 'playing')],
            components: [...gridRows, cashoutRow]
        });
    }
};

module.exports.createMinesEmbed = createMinesEmbed;
module.exports.createMinesGrid = createMinesGrid;
module.exports.createCashoutButton = createCashoutButton;
module.exports.createPlayAgainButton = createPlayAgainButton;
module.exports.calculateMultiplier = calculateMultiplier;
