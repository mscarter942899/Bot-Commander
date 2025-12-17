const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

const PS99_COLORS = {
    gold: 0xFFD700,
    success: 0x00FF88,
    error: 0xFF4444,
    info: 0x00BFFF,
    purple: 0x9B59B6,
    neon: 0x39FF14,
    pink: 0xFF69B4,
    orange: 0xFF8C00,
    diamond: 0x00CED1,
    ruby: 0xE0115F,
    emerald: 0x50C878,
    sapphire: 0x0F52BA,
    platinum: 0xE5E4E2,
    rainbow: 0xFF1493,
    cosmic: 0x6B3FA0,
    legendary: 0xFFAA00
};

const PREMIUM_BORDERS = {
    top: '╔══════════════════════════════════╗',
    bottom: '╚══════════════════════════════════╝',
    side: '║',
    divider: '═══════════════════════════════════',
    thinDivider: '────────────────────────────────────',
    starDivider: '✦ ═══════════════════════════ ✦',
    gemDivider: '💎 ═══════════════════════ 💎',
    sparkle: '✨ ═══════════════════════ ✨'
};

const ICONS = {
    gem: '💎',
    gold: '🪙',
    crown: '👑',
    star: '⭐',
    sparkle: '✨',
    trophy: '🏆',
    dice: '🎲',
    cards: '🃏',
    slots: '🎰',
    money: '💰',
    bank: '🏦',
    gift: '🎁',
    fire: '🔥',
    bolt: '⚡',
    heart: '❤️',
    clover: '🍀',
    rocket: '🚀',
    party: '🎉',
    confetti: '🎊',
    win: '🎯',
    lose: '💔',
    check: '✅',
    cross: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    clock: '⏰',
    hourglass: '⏳',
    chart: '📊',
    medal1: '🥇',
    medal2: '🥈',
    medal3: '🥉',
    rainbow: '🌈',
    mysteryBox: '📦',
    color: '🎨',
    question: '❓',
    brain: '🧠',
    potato: '🥔',
    bomb: '💣',
    guess: '🔮'
};

function createPremiumEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || PS99_COLORS.gold)
        .setTimestamp();

    if (options.title) {
        const titleIcon = options.titleIcon || ICONS.sparkle;
        embed.setTitle(`${titleIcon} ${options.title} ${titleIcon}`);
    }
    
    if (options.description) {
        let desc = options.description;
        if (options.addBorder) {
            desc = `\`\`\`\n${PREMIUM_BORDERS.starDivider}\`\`\`\n${desc}\n\`\`\`\n${PREMIUM_BORDERS.starDivider}\`\`\``;
        }
        embed.setDescription(desc);
    }
    
    if (options.fields) {
        const styledFields = options.fields.map(field => ({
            name: `${field.icon || ''} ${field.name}`.trim(),
            value: field.value,
            inline: field.inline !== undefined ? field.inline : true
        }));
        embed.addFields(styledFields);
    }
    
    if (options.footer) {
        embed.setFooter({ 
            text: `${ICONS.gem} ${options.footer} ${ICONS.gem}`,
            iconURL: options.footerIcon
        });
    } else {
        embed.setFooter({ text: `${ICONS.gem} PS99 Casino ${ICONS.gem} | Premium Gaming Experience` });
    }
    
    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }
    
    if (options.image) {
        embed.setImage(options.image);
    }
    
    if (options.author) {
        embed.setAuthor(options.author);
    }

    return embed;
}

function createPS99Embed(options = {}) {
    return createPremiumEmbed(options);
}

function createBalanceEmbed(user, balance, bank = 0) {
    const netWorth = balance + bank;
    let tier = 'Bronze';
    let tierColor = PS99_COLORS.orange;
    let tierIcon = '🥉';
    
    if (netWorth >= 1000000) {
        tier = 'Diamond';
        tierColor = PS99_COLORS.diamond;
        tierIcon = '💎';
    } else if (netWorth >= 500000) {
        tier = 'Platinum';
        tierColor = PS99_COLORS.platinum;
        tierIcon = '🏆';
    } else if (netWorth >= 100000) {
        tier = 'Gold';
        tierColor = PS99_COLORS.gold;
        tierIcon = '🥇';
    } else if (netWorth >= 50000) {
        tier = 'Silver';
        tierColor = PS99_COLORS.info;
        tierIcon = '🥈';
    }
    
    return createPremiumEmbed({
        title: `${user.username}'s Vault`,
        titleIcon: tierIcon,
        color: tierColor,
        description: `\`\`\`\n╭─────────────────────────────╮\n│       ${tier} Tier Member       │\n╰─────────────────────────────╯\`\`\``,
        fields: [
            { icon: ICONS.money, name: 'Cash', value: `\`\`\`diff\n+ ${balance.toLocaleString()} gems\`\`\``, inline: true },
            { icon: ICONS.bank, name: 'Bank', value: `\`\`\`yaml\n${bank.toLocaleString()} gems\`\`\``, inline: true },
            { icon: ICONS.chart, name: 'Net Worth', value: `\`\`\`fix\n${netWorth.toLocaleString()} gems\`\`\``, inline: true }
        ],
        footer: `${tier} Member | Use /daily for free gems!`
    });
}

function createWinEmbed(game, amount, multiplier, details = '') {
    const bigWin = multiplier >= 5;
    const jackpot = multiplier >= 10;
    
    let title = 'YOU WON!';
    let color = PS99_COLORS.success;
    let titleIcon = ICONS.party;
    
    if (jackpot) {
        title = 'JACKPOT!!!';
        color = PS99_COLORS.rainbow;
        titleIcon = ICONS.crown;
    } else if (bigWin) {
        title = 'BIG WIN!';
        color = PS99_COLORS.gold;
        titleIcon = ICONS.fire;
    }
    
    return createPremiumEmbed({
        title: title,
        titleIcon: titleIcon,
        color: color,
        description: `\`\`\`diff\n+ WINNER WINNER! +\`\`\`\n\n${ICONS.slots} **Game:** ${game}\n${ICONS.gem} **Won:** \`${amount.toLocaleString()}\` gems\n${ICONS.bolt} **Multiplier:** \`${multiplier}x\`\n\n${details}`,
        footer: `${bigWin ? 'INCREDIBLE! ' : ''}Keep playing to win more!`
    });
}

function createLoseEmbed(game, amount, details = '') {
    return createPremiumEmbed({
        title: 'Better Luck Next Time',
        titleIcon: ICONS.clover,
        color: PS99_COLORS.error,
        description: `\`\`\`diff\n- Game Over -\`\`\`\n\n${ICONS.slots} **Game:** ${game}\n${ICONS.gem} **Lost:** \`${amount.toLocaleString()}\` gems\n\n${details}`,
        footer: 'The house always has a chance... Try again!'
    });
}

function createErrorEmbed(message) {
    return createPremiumEmbed({
        title: 'Error',
        titleIcon: ICONS.cross,
        color: PS99_COLORS.error,
        description: `\`\`\`diff\n- ${message}\`\`\``
    });
}

function createSuccessEmbed(title, message) {
    return createPremiumEmbed({
        title: title,
        titleIcon: ICONS.check,
        color: PS99_COLORS.success,
        description: `\`\`\`diff\n+ Success!\`\`\`\n\n${message}`
    });
}

function createProfileEmbed(user, data) {
    const winRate = data.totalGames > 0 ? ((data.wins / data.totalGames) * 100).toFixed(1) : 0;
    const netWorth = data.balance + data.bank;
    
    let rank = 'Novice';
    let rankIcon = '🌱';
    if (data.totalGames >= 1000) { rank = 'Legend'; rankIcon = '👑'; }
    else if (data.totalGames >= 500) { rank = 'Master'; rankIcon = '🎖️'; }
    else if (data.totalGames >= 100) { rank = 'Expert'; rankIcon = '⭐'; }
    else if (data.totalGames >= 50) { rank = 'Regular'; rankIcon = '🎯'; }
    
    return createPremiumEmbed({
        title: `${user.username}'s Profile`,
        titleIcon: rankIcon,
        color: PS99_COLORS.cosmic,
        description: `\`\`\`\n╭───────────────────────────────╮\n│       ${rank} Gambler       │\n╰───────────────────────────────╯\`\`\``,
        fields: [
            { icon: ICONS.money, name: 'Balance', value: `\`${data.balance.toLocaleString()}\``, inline: true },
            { icon: ICONS.bank, name: 'Bank', value: `\`${data.bank.toLocaleString()}\``, inline: true },
            { icon: ICONS.gem, name: 'Net Worth', value: `\`${netWorth.toLocaleString()}\``, inline: true },
            { icon: ICONS.dice, name: 'Games', value: `\`${data.totalGames.toLocaleString()}\``, inline: true },
            { icon: ICONS.trophy, name: 'Wins', value: `\`${data.wins.toLocaleString()}\``, inline: true },
            { icon: ICONS.chart, name: 'Win Rate', value: `\`${winRate}%\``, inline: true },
            { icon: ICONS.gold, name: 'Wagered', value: `\`${data.totalWagered.toLocaleString()}\``, inline: true },
            { icon: ICONS.win, name: 'Total Won', value: `\`${data.totalWon.toLocaleString()}\``, inline: true },
            { icon: ICONS.fire, name: 'Daily Streak', value: `\`${data.dailyStreak || 0} days\``, inline: true }
        ]
    });
}

function createLeaderboardEmbed(users, type = 'balance') {
    const medals = [ICONS.medal1, ICONS.medal2, ICONS.medal3, '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let description = '```\n╭─────────────────────────────────╮\n│         TOP PLAYERS         │\n╰─────────────────────────────────╯```\n';
    
    users.slice(0, 10).forEach((user, index) => {
        const value = type === 'balance' ? user.balance + user.bank : user.totalWon;
        const bar = index < 3 ? '▓▓▓▓▓' : '▒▒▒▒▒';
        description += `${medals[index] || `${index + 1}.`} **${user.username}**\n└ \`${value.toLocaleString()}\` gems ${bar}\n`;
    });

    return createPremiumEmbed({
        title: type === 'balance' ? 'Richest Players' : 'Top Winners',
        titleIcon: ICONS.crown,
        color: PS99_COLORS.legendary,
        description: description || '```No players yet!```'
    });
}

function createGameEmbed(options = {}) {
    const gameIcons = {
        slots: ICONS.slots,
        blackjack: ICONS.cards,
        poker: ICONS.cards,
        roulette: '🎡',
        crash: ICONS.rocket,
        mines: ICONS.bomb,
        dice: ICONS.dice,
        coinflip: ICONS.gold,
        highlow: '📊',
        war: '⚔️',
        baccarat: ICONS.cards
    };
    
    const icon = gameIcons[options.game] || ICONS.dice;
    
    return createPremiumEmbed({
        title: options.title || options.game,
        titleIcon: icon,
        color: options.color || PS99_COLORS.purple,
        description: options.description,
        fields: options.fields,
        footer: options.footer || `Bet: ${options.bet?.toLocaleString() || 0} gems`
    });
}

function createEventEmbed(options = {}) {
    return createPremiumEmbed({
        title: options.title,
        titleIcon: options.icon || ICONS.party,
        color: options.color || PS99_COLORS.rainbow,
        description: `\`\`\`\n╔═══════════════════════════════════╗\n║       ✨ SPECIAL EVENT ✨       ║\n╚═══════════════════════════════════╝\`\`\`\n\n${options.description}`,
        fields: options.fields,
        footer: options.footer || 'Limited Time Event!'
    });
}

function createColorGuessEmbed(color, timeLeft, prize) {
    const colorEmojis = {
        red: '🔴',
        blue: '🔵',
        green: '🟢',
        yellow: '🟡',
        purple: '🟣',
        orange: '🟠',
        white: '⚪',
        black: '⚫'
    };
    
    return createPremiumEmbed({
        title: 'Guess The Color!',
        titleIcon: ICONS.color,
        color: PS99_COLORS.rainbow,
        description: `\`\`\`\n╭─────────────────────────────╮\n│    🎨 COLOR GUESSING GAME 🎨    │\n╰─────────────────────────────╯\`\`\`\n\n${ICONS.gem} **Prize:** \`${prize.toLocaleString()}\` gems\n${ICONS.clock} **Time Left:** \`${timeLeft}s\`\n\n**Click a color button to guess!**\n\n🔴 🔵 🟢 🟡 🟣 🟠`,
        footer: 'First correct guess wins!'
    });
}

function createNumberGuessEmbed(range, timeLeft, prize, hints = []) {
    let hintsText = hints.length > 0 ? `\n\n**Hints:**\n${hints.map(h => `• ${h}`).join('\n')}` : '';
    
    return createPremiumEmbed({
        title: 'Guess The Number!',
        titleIcon: ICONS.guess,
        color: PS99_COLORS.cosmic,
        description: `\`\`\`\n╭─────────────────────────────╮\n│    🔮 NUMBER GUESSING GAME 🔮    │\n╰─────────────────────────────╯\`\`\`\n\n${ICONS.gem} **Prize:** \`${prize.toLocaleString()}\` gems\n${ICONS.clock} **Time Left:** \`${timeLeft}s\`\n🔢 **Range:** \`1 - ${range}\`\n\n**Type a number in chat to guess!**${hintsText}`,
        footer: 'Closest guess wins if no one gets it exact!'
    });
}

function createTriviaEmbed(question, options, timeLeft, prize, category) {
    const optionLetters = ['🅰️', '🅱️', '🅲', '🅳'];
    let optionsText = options.map((opt, i) => `${optionLetters[i]} ${opt}`).join('\n');
    
    return createPremiumEmbed({
        title: 'Trivia Time!',
        titleIcon: ICONS.brain,
        color: PS99_COLORS.sapphire,
        description: `\`\`\`\n╭─────────────────────────────╮\n│       🧠 ${category.toUpperCase()} 🧠       │\n╰─────────────────────────────╯\`\`\`\n\n**${question}**\n\n${optionsText}\n\n${ICONS.gem} **Prize:** \`${prize.toLocaleString()}\` gems\n${ICONS.clock} **Time Left:** \`${timeLeft}s\``,
        footer: 'Click the correct answer!'
    });
}

function createHotPotatoEmbed(currentHolder, timeLeft, prize, round) {
    return createPremiumEmbed({
        title: 'Hot Potato!',
        titleIcon: ICONS.potato,
        color: PS99_COLORS.orange,
        description: `\`\`\`\n╭─────────────────────────────╮\n│     💣 DON'T GET BURNED! 💣     │\n╰─────────────────────────────╯\`\`\`\n\n${ICONS.potato} **Current Holder:** ${currentHolder}\n${ICONS.clock} **Time Until BOOM:** \`???\`\n🔄 **Round:** \`${round}\`\n\n${ICONS.gem} **Prize Pool:** \`${prize.toLocaleString()}\` gems\n\n**Click 'Pass' to throw the potato!**`,
        footer: 'Last one NOT holding wins!'
    });
}

function createMysteryBoxEmbed(tier, prizes) {
    const tierColors = {
        common: PS99_COLORS.info,
        rare: PS99_COLORS.purple,
        epic: PS99_COLORS.pink,
        legendary: PS99_COLORS.legendary
    };
    
    const tierEmojis = {
        common: '📦',
        rare: '🎁',
        epic: '💜',
        legendary: '👑'
    };
    
    return createPremiumEmbed({
        title: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Mystery Box`,
        titleIcon: tierEmojis[tier] || ICONS.mysteryBox,
        color: tierColors[tier] || PS99_COLORS.gold,
        description: `\`\`\`\n╭─────────────────────────────╮\n│    ✨ MYSTERY BOX ✨    │\n╰─────────────────────────────╯\`\`\`\n\n**Possible Prizes:**\n${prizes.map(p => `• ${p}`).join('\n')}\n\n**Click to open!**`,
        footer: `${tier.toUpperCase()} tier box`
    });
}

module.exports = {
    PS99_COLORS,
    ICONS,
    PREMIUM_BORDERS,
    createPS99Embed,
    createPremiumEmbed,
    createBalanceEmbed,
    createWinEmbed,
    createLoseEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createProfileEmbed,
    createLeaderboardEmbed,
    createGameEmbed,
    createEventEmbed,
    createColorGuessEmbed,
    createNumberGuessEmbed,
    createTriviaEmbed,
    createHotPotatoEmbed,
    createMysteryBoxEmbed
};
