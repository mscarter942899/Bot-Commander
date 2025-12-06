# PS99 Casino Discord Bot

## Project Overview
A comprehensive Discord casino bot featuring PS99-style UI with animated gambling games, gem economy, raffle system, and 24/7 uptime.

## Project Structure
```
project/
├── commands/          # Slash command handlers
├── prefixCommands/    # Prefix command handlers (!)
├── buttons/           # Button interaction handlers
├── events/            # Discord event handlers
├── menus/             # Menu interaction handlers
├── utils/             # Utility functions (embeds, cards, uptime)
├── database/          # JSON-based database
├── assets/            # Card images and assets
├── uptime/            # Uptime tracking data
├── index.js           # Main bot entry point
├── config.json        # Bot configuration
└── package.json       # Dependencies
```

## Key Components

### Economy System
- Gem-based currency with cash and bank
- Daily rewards with streak bonuses
- Gift system between users
- Leaderboard tracking

### Gambling Games
- **Slots**: Animated 3-reel machine with 8-12 frame animation
- **Blackjack**: Real card emojis, full game logic
- **Poker**: Texas Hold'em with 5 community cards
- **Higher/Lower**: Card prediction game
- **War**: 1v1 card battle

### Raffle System
- Multi-winner support
- Live percentage chances
- Join/Cancel/Refund buttons
- Raffle history tracking

### Admin Features
- Add/remove gems
- House profit tracking
- Announcement system
- Configurable logging channel

## Tech Stack
- Node.js 20
- discord.js v14
- Express (uptime server)
- JSON file storage

## Required Secrets
- `DISCORD_TOKEN` - Discord bot token

## Running the Bot
The bot runs on port 5000 with an Express server for uptime monitoring.
The self-ping loop runs every 4 minutes to maintain activity.
