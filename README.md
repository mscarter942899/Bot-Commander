# PS99 Casino Discord Bot

A feature-rich Discord casino bot with PS99-style UI, animated gambling games, raffle system, and gem economy.

## Features

### Economy System
- `/balance` - Check your gem balance
- `/daily` - Claim daily gems with streak bonuses
- `/gift` - Gift gems to other users
- `/deposit` - Deposit gems to bank
- `/withdraw` - Withdraw gems from bank
- `/top` - View leaderboard
- `/profile` - View detailed stats

### Gambling Games
- **Slots** - Animated slot machine with progressive reel stopping
- **Blackjack** - Real card emojis, hit/stand/double/surrender
- **Poker** - Texas Hold'em with community cards
- **Higher/Lower** - Guess the next card
- **War** - Card battle against dealer

### Raffle System
- `/raffle start` - Create a new raffle
- `/raffle end` - End and pick winners
- `/raffle cancel` - Cancel with refunds
- `/raffle view` - View active raffle
- `/raffle history` - View past raffles

### Admin Commands
- `/addgems` - Add gems to user
- `/removegems` - Remove gems from user
- `/houseprofit` - View house statistics
- `/announce` - Make announcements
- `/setlogs` - Configure logging channel

## Setup

1. Add your Discord bot token as `DISCORD_TOKEN` secret
2. Run the bot with `node index.js`
3. The bot will auto-register slash commands on startup

## Prefix Commands

All commands also work with `!` prefix:
- `!bal`, `!daily`, `!gift`, `!deposit`, `!withdraw`
- `!slots`, `!bj`, `!poker`, `!hl`, `!war`
- `!raffle`, `!help`

## 24/7 Uptime

The bot includes a built-in Express server and self-ping mechanism to maintain uptime.
