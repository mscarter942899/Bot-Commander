const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');
const { getPokerHandRank } = require('../utils/cards');
const { createPokerEmbed, createPokerButtons, createPlayAgainButton } = require('../commands/poker');

const STAGES = ['preflop', 'flop', 'turn', 'river', 'showdown'];

module.exports = {
    customId: 'poker',
    
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const gameId = parts.slice(2).join('_');
        
        if (action === 'again') {
            const bet = parseInt(gameId);
            const user = db.getUser(interaction.user.id, interaction.user.username);
            
            if (user.balance < bet * 3) {
                return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)], ephemeral: true });
            }
            
            const pokerCommand = client.commands.get('poker');
            interaction.options = { getInteger: () => bet };
            return pokerCommand.execute(interaction, client);
        }
        
        const game = client.activeGames.get(gameId);
        
        if (!game) {
            return interaction.reply({ embeds: [createErrorEmbed('This game has expired!')], ephemeral: true });
        }
        
        if (game.userId !== interaction.user.id) {
            return interaction.reply({ embeds: [createErrorEmbed('This is not your game!')], ephemeral: true });
        }
        
        const { playerCards, dealerCards, communityCards, bet } = game;
        
        if (action === 'fold') {
            client.activeGames.delete(gameId);
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
            
            db.addLog({
                type: 'poker',
                userId: interaction.user.id,
                username: interaction.user.username,
                bet: bet,
                won: false,
                result: 'fold'
            });
            
            return interaction.update({
                embeds: [createPokerEmbed(playerCards, communityCards, bet, game.pot, 'river', 'fold')],
                components: [createPlayAgainButton(bet)]
            });
        }
        
        if (action === 'raise') {
            const user = db.getUser(interaction.user.id);
            if (user.balance < bet) {
                return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems to raise!`)], ephemeral: true });
            }
            db.removeBalance(interaction.user.id, bet);
            game.bet += bet;
            game.pot += bet * 2;
        }
        
        const currentStageIndex = STAGES.indexOf(game.stage);
        
        if (currentStageIndex < 3) {
            game.stage = STAGES[currentStageIndex + 1];
            client.activeGames.set(gameId, game);
            
            return interaction.update({
                embeds: [createPokerEmbed(playerCards, communityCards, game.bet, game.pot, game.stage, 'playing')],
                components: [createPokerButtons(gameId, game.stage, false)]
            });
        }
        
        const playerFullHand = [...playerCards, ...communityCards];
        const dealerFullHand = [...dealerCards, ...communityCards];
        
        const playerRank = getPokerHandRank(playerFullHand.slice(0, 5));
        const dealerRank = getPokerHandRank(dealerFullHand.slice(0, 5));
        
        client.activeGames.delete(gameId);
        
        let status, winAmount = 0;
        const rigChance = Math.random();
        
        if (rigChance < 0.52) {
            status = 'lose';
        } else if (playerRank.rank > dealerRank.rank) {
            status = 'win';
        } else if (playerRank.rank < dealerRank.rank) {
            status = 'lose';
        } else {
            status = rigChance < 0.6 ? 'lose' : 'win';
        }
        
        if (status === 'win') {
            winAmount = game.pot;
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, game.bet, winAmount);
            db.addHouseProfit(game.bet - winAmount);
        } else {
            db.recordGame(interaction.user.id, false, game.bet);
            db.addHouseProfit(game.bet);
        }
        
        db.addLog({
            type: 'poker',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet: game.bet,
            won: status === 'win',
            winAmount: winAmount,
            playerHand: playerRank.name,
            result: status
        });
        
        return interaction.update({
            embeds: [createPokerEmbed(playerCards, communityCards, game.bet, game.pot, 'river', status, `${playerRank.name} vs ${dealerRank.name}`)],
            components: [createPlayAgainButton(bet)]
        });
    }
};
