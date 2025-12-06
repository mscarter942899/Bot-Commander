const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { calculateHandValue, handToString } = require('../utils/cards');
const { createBlackjackEmbed, createPlayAgainButton } = require('../commands/blackjack');

module.exports = {
    customId: 'bj',
    
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
            
            const bjCommand = client.commands.get('blackjack');
            interaction.options = { getInteger: () => bet };
            return bjCommand.execute(interaction, client);
        }
        
        const game = client.activeGames.get(gameId);
        
        if (!game) {
            return interaction.reply({ embeds: [createErrorEmbed('This game has expired!')], ephemeral: true });
        }
        
        if (game.userId !== interaction.user.id) {
            return interaction.reply({ embeds: [createErrorEmbed('This is not your game!')], ephemeral: true });
        }
        
        const { deck, playerHand, dealerHand, bet } = game;
        
        if (action === 'hit') {
            playerHand.push(deck.pop());
            const playerValue = calculateHandValue(playerHand);
            
            if (playerValue > 21) {
                client.activeGames.delete(gameId);
                db.recordGame(interaction.user.id, false, bet);
                db.addHouseProfit(bet);
                
                db.addLog({
                    type: 'blackjack',
                    userId: interaction.user.id,
                    username: interaction.user.username,
                    bet: bet,
                    won: false,
                    result: 'Bust'
                });
                
                return interaction.update({
                    embeds: [createBlackjackEmbed(playerHand, dealerHand, bet, false, 'bust')],
                    components: [createPlayAgainButton(bet)]
                });
            }
            
            return interaction.update({
                embeds: [createBlackjackEmbed(playerHand, dealerHand, bet, true, 'playing')],
                components: interaction.message.components
            });
            
        } else if (action === 'stand' || action === 'double') {
            if (action === 'double') {
                const user = db.getUser(interaction.user.id);
                if (user.balance < bet) {
                    return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems to double!`)], ephemeral: true });
                }
                db.removeBalance(interaction.user.id, bet);
                game.bet = bet * 2;
                game.doubled = true;
                playerHand.push(deck.pop());
                
                if (calculateHandValue(playerHand) > 21) {
                    client.activeGames.delete(gameId);
                    db.recordGame(interaction.user.id, false, game.bet);
                    db.addHouseProfit(game.bet);
                    
                    return interaction.update({
                        embeds: [createBlackjackEmbed(playerHand, dealerHand, game.bet, false, 'bust')],
                        components: [createPlayAgainButton(bet)]
                    });
                }
            }
            
            while (calculateHandValue(dealerHand) < 17) {
                dealerHand.push(deck.pop());
            }
            
            const playerValue = calculateHandValue(playerHand);
            const dealerValue = calculateHandValue(dealerHand);
            const finalBet = game.bet;
            
            let status, winAmount = 0;
            
            if (dealerValue > 21 || playerValue > dealerValue) {
                status = 'win';
                winAmount = finalBet * 2;
                db.addBalance(interaction.user.id, winAmount);
                db.recordGame(interaction.user.id, true, finalBet, winAmount);
                db.addHouseProfit(finalBet - winAmount);
            } else if (playerValue < dealerValue) {
                status = 'lose';
                db.recordGame(interaction.user.id, false, finalBet);
                db.addHouseProfit(finalBet);
            } else {
                status = 'push';
                db.addBalance(interaction.user.id, finalBet);
            }
            
            client.activeGames.delete(gameId);
            
            db.addLog({
                type: 'blackjack',
                userId: interaction.user.id,
                username: interaction.user.username,
                bet: finalBet,
                won: status === 'win',
                winAmount: winAmount,
                result: status
            });
            
            return interaction.update({
                embeds: [createBlackjackEmbed(playerHand, dealerHand, finalBet, false, status)],
                components: [createPlayAgainButton(bet)]
            });
            
        } else if (action === 'surrender') {
            client.activeGames.delete(gameId);
            const refund = Math.floor(bet / 2);
            db.addBalance(interaction.user.id, refund);
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet - refund);
            
            return interaction.update({
                embeds: [createBlackjackEmbed(playerHand, dealerHand, bet, false, 'lose')],
                components: [createPlayAgainButton(bet)]
            });
        }
    }
};
