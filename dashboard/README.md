# Casino Bot Dashboard

A web-based dashboard for managing your Discord Casino Bot configuration.

## Features

✅ **General Settings** - Enable/disable daily rewards, adjust amounts
✅ **Channel Management** - Configure deposit and withdrawal channels
✅ **Game Configuration** - Customize min/max bets and RTP for each game
✅ **Statistics** - View bot stats and top users

## Local Development

The dashboard runs automatically when you start the bot. Visit:
- **Local**: `http://localhost:5000`
- **Replit**: The URL shown in your project
- **Railway**: Your Railway project domain

## Deployment to Railway

### 1. Push to GitHub
```bash
git add .
git commit -m "Add dashboard"
git push origin main
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Add environment variables:
   - `DISCORD_TOKEN` - Your bot token
   - `NODE_ENV` - Set to `production`

5. Deploy! Your dashboard will be available at your Railway domain

### 3. Configure Bot Settings

Once deployed, visit your Railway domain to:
- Configure game settings
- Set channel IDs
- Enable/disable features
- Monitor statistics

## API Endpoints

- `GET /api/settings` - Get all settings
- `POST /api/settings/general` - Update general settings
- `POST /api/settings/channels` - Update channel IDs
- `POST /api/settings/game/:gameName` - Update game settings
- `GET /api/stats` - Get bot statistics
- `GET /api/top-users` - Get top 10 users

## Notes

- The dashboard is secured by being on your private network (local) or Railway
- All settings are saved to your database immediately
- Changes take effect right away for new commands
