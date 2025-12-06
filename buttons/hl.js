const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');
const { compareCards } = require('../utils/cards');
const { createHighLowEmbed, createPlayAgainButton } = require('../commands/highlow');

module.exports = {
    customId: 'hl',
    
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const gameId = parts.slice(2).join('_');
        
        if (action === 'again') {
            const bet = parseInt(gameId);
            const user = db.getUser(interaction.user.id, interaction.user.username);
            
            if (user.balance < bet) {
                return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)], ephemeral: true });
            }
            
            const hlCommand = client.commands.get('highlow');
            interaction.options = { getInteger: () => bet };
            return hlCommand.execute(interaction, client);
        }
        
        const game = client.activeGames.get(gameId);
        
        if (!game) {
            return interaction.reply({ embeds: [createErrorEmbed('This game has expired!')], ephemeral: true });
        }
        
        if (game.userId !== interaction.user.id) {
            return interaction.reply({ embeds: [createErrorEmbed('This is not your game!')], ephemeral: true });
        }
        
        const { currentCard, nextCard, bet } = game;
        const comparison = compareCards(nextCard, currentCard);
        
        let status;
        if (action === 'higher') {
            if (comparison > 0) status = 'win';
            else if (comparison < 0) status = 'lose';
            else status = 'tie';
        } else {
            if (comparison < 0) status = 'win';
            else if (comparison > 0) status = 'lose';
            else status = 'tie';
        }
        
        client.activeGames.delete(gameId);
        
        if (status === 'win') {
            const winAmount = bet * 2;
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
        } else if (status === 'lose') {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
        } else {
            db.addBalance(interaction.user.id, bet);
        }
        
        db.addLog({
            type: 'highlow',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet: bet,
            won: status === 'win',
            choice: action,
            result: status
        });
        
        return interaction.update({
            embeds: [createHighLowEmbed(currentCard, bet, status, null, nextCard)],
            components: [createPlayAgainButton(bet)]
        });
    }
};
