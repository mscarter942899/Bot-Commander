const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const CARD_EMOJIS = {
    spades: {
        'A': '🂡', '2': '🂢', '3': '🂣', '4': '🂤', '5': '🂥', '6': '🂦', '7': '🂧',
        '8': '🂨', '9': '🂩', '10': '🂪', 'J': '🂫', 'Q': '🂭', 'K': '🂮'
    },
    hearts: {
        'A': '🂱', '2': '🂲', '3': '🂳', '4': '🂴', '5': '🂵', '6': '🂶', '7': '🂷',
        '8': '🂸', '9': '🂹', '10': '🂺', 'J': '🂻', 'Q': '🂽', 'K': '🂾'
    },
    diamonds: {
        'A': '🃁', '2': '🃂', '3': '🃃', '4': '🃄', '5': '🃅', '6': '🃆', '7': '🃇',
        '8': '🃈', '9': '🃉', '10': '🃊', 'J': '🃋', 'Q': '🃍', 'K': '🃎'
    },
    clubs: {
        'A': '🃑', '2': '🃒', '3': '🃓', '4': '🃔', '5': '🃕', '6': '🃖', '7': '🃗',
        '8': '🃘', '9': '🃙', '10': '🃚', 'J': '🃛', 'Q': '🃝', 'K': '🃞'
    }
};

const SUIT_EMOJIS = {
    spades: '♠️',
    hearts: '♥️',
    diamonds: '♦️',
    clubs: '♣️'
};

const CARD_BACK = '🂠';

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank, value: getCardValue(rank) });
        }
    }
    return shuffleDeck(deck);
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseInt(rank);
}

function getCardEmoji(card) {
    return CARD_EMOJIS[card.suit]?.[card.rank] || `${card.rank}${SUIT_EMOJIS[card.suit]}`;
}

function getCardDisplay(card, hidden = false) {
    if (hidden) return CARD_BACK;
    return getCardEmoji(card);
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    
    for (const card of hand) {
        if (card.rank === 'A') {
            aces++;
            value += 11;
        } else if (['K', 'Q', 'J'].includes(card.rank)) {
            value += 10;
        } else {
            value += parseInt(card.rank);
        }
    }
    
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    
    return value;
}

function handToString(hand, hideFirst = false) {
    return hand.map((card, i) => {
        if (hideFirst && i === 0) return CARD_BACK;
        return getCardEmoji(card);
    }).join(' ');
}

function compareCards(card1, card2) {
    const order = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const val1 = order.indexOf(card1.rank);
    const val2 = order.indexOf(card2.rank);
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
    return 0;
}

function getPokerHandRank(cards) {
    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    
    const isFlush = suits.every(s => s === suits[0]);
    const order = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const sortedRanks = ranks.map(r => order.indexOf(r)).sort((a, b) => a - b);
    const isStraight = sortedRanks.every((v, i, arr) => i === 0 || v === arr[i - 1] + 1);
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    if (isFlush && isStraight && sortedRanks[4] === 12) return { rank: 10, name: 'Royal Flush' };
    if (isFlush && isStraight) return { rank: 9, name: 'Straight Flush' };
    if (counts[0] === 4) return { rank: 8, name: 'Four of a Kind' };
    if (counts[0] === 3 && counts[1] === 2) return { rank: 7, name: 'Full House' };
    if (isFlush) return { rank: 6, name: 'Flush' };
    if (isStraight) return { rank: 5, name: 'Straight' };
    if (counts[0] === 3) return { rank: 4, name: 'Three of a Kind' };
    if (counts[0] === 2 && counts[1] === 2) return { rank: 3, name: 'Two Pair' };
    if (counts[0] === 2) return { rank: 2, name: 'Pair' };
    return { rank: 1, name: 'High Card' };
}

module.exports = {
    SUITS,
    RANKS,
    CARD_EMOJIS,
    SUIT_EMOJIS,
    CARD_BACK,
    createDeck,
    shuffleDeck,
    getCardValue,
    getCardEmoji,
    getCardDisplay,
    calculateHandValue,
    handToString,
    compareCards,
    getPokerHandRank
};
