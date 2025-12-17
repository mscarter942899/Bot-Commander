# PS99 Casino Discord Bot

## Project Overview
A comprehensive Discord casino bot featuring PS99-style premium UI with animated gambling games, gem economy, shop system, inventory, raffle systems, fun admin events, and 24/7 uptime. Ready for deployment on Railway, Replit, or any Node.js host.

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
├── package.json       # Dependencies
├── Procfile           # Railway/Heroku deployment
├── railway.json       # Railway configuration
└── nixpacks.toml      # Nixpacks build config
```

## Key Components

### Economy System
- Gem-based currency with cash and bank
- Daily rewards with streak bonuses (up to 1000 bonus)
- Gift system between users
- Tier-based leaderboard (Bronze, Silver, Gold, Platinum, Diamond)

### Gambling Games (11 Total)
- **Slots**: Animated 3-reel machine with premium visuals
- **Blackjack**: Real card emojis, full game logic
- **Poker**: Texas Hold'em with 5 community cards
- **Higher/Lower**: Card prediction game
- **War**: 1v1 card battle
- **Roulette**: Bet on colors, numbers, or ranges (2x-35x payouts)
- **Baccarat**: Player vs Banker betting
- **Crash**: Watch multiplier grow, cash out before crash!
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

### Fun Admin Events (NEW!)
- `/admin fun makeitrain` - Give gems to all reactors
- `/admin fun guesscolor` - Color guessing game for gems
- `/admin fun guessnumber` - Number guessing with hints
- `/admin fun trivia` - Trivia quiz with categories
- `/admin fun hotpotato` - Pass the potato multiplayer game
- `/admin fun mysterybox` - Drop mystery boxes (Common/Rare/Epic/Legendary)
- `/admin fun jackpot` - Random user jackpot
- `/admin fun rigged` - Fun rigged coinflip

## Premium UI Features
- ANSI color codes for vibrant embeds
- Tier-based styling (Bronze to Diamond)
- Animated slot machines
- Paginated help menu with navigation
- Visual streak indicators
- Premium game displays with status banners

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

## Deployment

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set `DISCORD_TOKEN` in environment variables
3. Deploy! Railway auto-detects from Procfile/railway.json

### Replit Deployment
1. Import the repository
2. Add `DISCORD_TOKEN` to Secrets
3. Run the bot

### Other Hosts
```bash
npm install
DISCORD_TOKEN=your_token node index.js
```

## Running the Bot
The bot runs on PORT (env) or 5000 with an Express server for uptime monitoring.
The self-ping loop runs every 4 minutes to maintain activity.

## Recent Changes (December 2025)
- Added Railway deployment support (Procfile, railway.json, nixpacks.toml)
- Added 6 new fun admin event commands
- Premium UI overhaul with ANSI colors and tier system
- Paginated help menu with navigation buttons
- Enhanced embeds for all games
- Fixed Mines multiplier calculation formula
- Changed Mines grid from 5x5 to 4x4 (16 tiles)
- Fixed Roulette green/number payouts to return 36x correctly
