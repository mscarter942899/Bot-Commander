# PS99 Casino Discord Bot

A feature-rich Discord casino bot with PS99-style UI, 11 gambling games, shop system, inventory, raffle system, and gem economy.

## Features

### Economy System
- `/balance` - Check your gem balance
- `/daily` - Claim daily gems with streak bonuses
- `/gift` - Gift gems to other users
- `/deposit` - Deposit gems to bank
- `/withdraw` - Withdraw gems from bank
- `/top` - View leaderboard
- `/profile` - View detailed stats

### Gambling Games (11 Games!)
- **Slots** - Animated slot machine with progressive reel stopping
- **Blackjack** - Real card emojis, hit/stand/double/surrender
- **Poker** - Texas Hold'em with community cards
- **Higher/Lower** - Guess the next card
- **War** - Card battle against dealer
- **Roulette** - Bet on colors, numbers, or ranges (2x-35x payouts)
- **Baccarat** - Player vs Banker vs Tie betting
- **Crash** - Watch multiplier grow, cash out before crash!
- **Dice** - Roll dice with high/low/seven/even/odd bets
- **Mines** - Reveal gems, avoid bombs, cash out anytime
- **Coinflip** - Simple double or nothing

### Shop System
- `/shop browse` - Browse available items
- `/shop buy <id>` - Purchase an item
- `/shop add` - Add item to shop (Admin)
- `/shop edit` - Edit shop item (Admin)
- `/shop remove` - Remove item from shop (Admin)

### Inventory System
- `/inventory view` - View your items
- `/inventory item <number>` - View item details
- `/inventory gift <number> @user` - Gift items to others

### Gem Raffle System
- `/raffle start` - Create a new gem raffle
- `/raffle end` - End and pick winners
- `/raffle cancel` - Cancel with refunds
- `/raffle view` - View active raffle
- `/raffle history` - View past raffles

### Item Raffle System
- `/itemraffle start` - Create item raffle with images
- `/itemraffle end` - End and award items
- `/itemraffle cancel` - Cancel with refunds
- `/itemraffle view` - View active item raffle
- `/itemraffle history` - View past item raffles
- Supports any duration: `30s`, `5m`, `2h`, `1d`, `1w`

### Admin Commands
- `/addgems` - Add gems to user
- `/removegems` - Remove gems from user
- `/houseprofit` - View house statistics
- `/announce` - Make announcements
- `/setlogs` - Configure logging channel

### Admin Panel (`/admin`)
- `/admin games setbet` - Set min/max bets for games
- `/admin games toggle` - Enable/disable games
- `/admin games settings` - View all game settings
- `/admin economy reset` - Reset user balance
- `/admin economy set` - Set user balance
- `/admin economy stats` - View economy statistics
- `/admin inventory grant` - Grant items to users
- `/admin inventory clear` - Clear user inventory
- `/admin fun makeitrain` - Give gems to reactors
- `/admin fun rigged` - Rigged coinflip (for fun)
- `/admin fun jackpot` - Random jackpot to a user

## Setup

1. Add your Discord bot token as `DISCORD_TOKEN` secret
2. Run the bot with `node index.js`
3. The bot will auto-register slash commands on startup

## Prefix Commands

All commands also work with `!` prefix:
- Economy: `!bal`, `!daily`, `!gift`, `!deposit`, `!withdraw`
- Games: `!slots`, `!bj`, `!poker`, `!hl`, `!war`, `!roulette`, `!coinflip`, `!dice`
- Shop: `!shop`, `!shop buy <id>`, `!inv`
- Raffle: `!raffle`
- Help: `!help`

## 24/7 Uptime

The bot includes a built-in Express server and self-ping mechanism to maintain uptime.
