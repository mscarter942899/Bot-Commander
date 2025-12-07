# PS99 Casino Discord Bot

## Project Overview
A comprehensive Discord casino bot featuring PS99-style UI with animated gambling games, gem economy, shop system, inventory, raffle systems, and 24/7 uptime.

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

### Gambling Games (11 Total)
- **Slots**: Animated 3-reel machine with 8-12 frame animation
- **Blackjack**: Real card emojis, full game logic
- **Poker**: Texas Hold'em with 5 community cards
- **Higher/Lower**: Card prediction game
- **War**: 1v1 card battle
- **Roulette**: Bet on colors, numbers, or ranges
- **Baccarat**: Player vs Banker betting
- **Crash**: Watch multiplier grow, cash out before crash
- **Dice**: Roll dice with various bet types
- **Mines**: Reveal gems in 4x4 grid, avoid bombs
- **Coinflip**: Double or nothing

### Shop System
- Admin can add/edit/remove shop items
- Items have prices, stock, categories, images
- Users can browse and buy items
- Purchased items go to inventory

### Inventory System
- Users can view their items
- Gift items to other users
- Track item sources (shop, raffle, admin)

### Raffle Systems
- **Gem Raffles**: Win gem prizes
- **Item Raffles**: Win custom items with images
  - Supports any duration (seconds to weeks)
  - Image support for prizes
  - Multi-winner support

### Admin Features
- Add/remove gems
- House profit tracking
- Announcement system
- Configurable logging channel
- Game settings (min/max bets, enable/disable)
- Shop management
- Inventory management (grant/clear items)
- Fun commands (make it rain, rigged coinflip, jackpot)

## Database Files
- `users.json` - User data with inventory
- `shop.json` - Shop items
- `raffles.json` - Gem raffle data
- `itemRaffles.json` - Item raffle data
- `gameSettings.json` - Game configuration
- `settings.json` - Bot settings
- `logs.json` - Activity logs

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

## Recent Changes (December 2025)
- Fixed Mines multiplier calculation formula
- Changed Mines grid from 5x5 to 4x4 (16 tiles) to fit cash-out button within Discord's 5 action row limit
- Fixed Roulette green/number payouts to return 36x correctly
- Added gridSize tracking to Mines game state for consistency
