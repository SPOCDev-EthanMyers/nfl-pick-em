# 🏈 NFL Pick 'Em Challenge - Gridiron Gauntlet

A full-stack sports application for running weekly NFL pick 'em contests against the spread. Challenge your friends to pick winners for each NFL game of the week!

## Features

- **Real-time NFL Data**: Automatically fetches weekly NFL games from ESPN API
- **Against the Spread**: Set custom spreads for each game
- **Player Management**: Add/remove players dynamically
- **Interactive Picks**: Click to toggle team selections for each game
- **Admin Panel**: Complete control over week settings, spreads, and players
- **Persistent Storage**: All data saved locally in JSON files
- **Football-Themed UI**: Sporty design with custom fonts and team colors

## Tech Stack

### Backend
- Node.js
- Express.js
- Axios (for ESPN API calls)
- JSON file storage

### Frontend
- React 18
- React Hooks for state management
- Axios for API calls
- Custom CSS with Google Fonts

## Project Structure

```
nfl-pick-em/
├── server/
│   ├── index.js          # Express server and API routes
│   └── data/             # JSON data storage (auto-created)
│       ├── spreads.json  # Game spreads
│       ├── players.json  # Players and selections
│       └── settings.json # App settings (current week)
├── client/
│   ├── public/
│   │   └── index.html    # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPanel.js     # Admin controls
│   │   │   ├── AdminPanel.css
│   │   │   ├── GameList.js       # Games display
│   │   │   ├── GameList.css
│   │   │   ├── PlayerList.js     # Player picks grid
│   │   │   └── PlayerList.css
│   │   ├── App.js        # Main application
│   │   ├── App.css
│   │   ├── index.js      # React entry point
│   │   └── index.css
│   └── package.json
├── package.json
├── CLAUDE.md            # Project specifications
└── README.md            # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Step 1: Install Dependencies

Install root dependencies (server):
```bash
npm install
```

Install client dependencies:
```bash
cd client
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-all
```

### Step 2: Start the Application

**Option A: Run both server and client together (recommended)**
```bash
npm run dev
```

**Option B: Run separately**

Terminal 1 - Start the backend server:
```bash
npm run server
```

Terminal 2 - Start the React frontend:
```bash
npm run client
```

### Step 3: Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage Guide

### First Time Setup

1. **Open the Admin Panel**: Click "Show Admin" button in the header

2. **Set Current Week**:
   - Enter the NFL week number (1-18)
   - Click "Update Week"

3. **Add Players**:
   - Enter player name in the input field
   - Click "Add Player"
   - Repeat for all participants

4. **Set Spreads**:
   - Scroll to the Spreads section
   - Enter spread value for each game (e.g., 3, 2.5, 7)
   - Click "Set" to save
   - Click "Toggle" to switch which team is favored
   - Gold highlighting shows the favored team

### Making Picks

1. In the main view, you'll see:
   - **Left side**: All games with spreads
   - **Right side**: Players and their picks grid

2. To make a selection:
   - Click on a cell in the player's row under a game
   - First click: Selects home team
   - Second click: Selects away team
   - Third click: Clears selection

3. The cell will show the team abbreviation in team colors

### Managing Data

- **Refresh Data**: Click "🔄 Refresh All Data" in Admin Panel to reload games from ESPN
- **Delete Player**: Click "✕" next to player name
- **Update Spreads**: Can be changed anytime, even during the week

## API Endpoints

### Games
- `GET /api/games` - Fetch NFL games from ESPN API

### Spreads
- `GET /api/spreads` - Get all spreads
- `POST /api/spreads` - Update spread for a game
  ```json
  {
    "gameId": "401772820",
    "spread": 3.5,
    "favoredTeam": "25"
  }
  ```

### Players
- `GET /api/players` - Get all players and selections
- `POST /api/players` - Add/update a player
  ```json
  {
    "name": "John Doe",
    "selections": {}
  }
  ```
- `PUT /api/players/:name/selection` - Update player's pick
  ```json
  {
    "gameId": "401772820",
    "teamId": "25"
  }
  ```
- `DELETE /api/players/:name` - Delete a player

### Settings
- `GET /api/settings` - Get app settings
- `POST /api/settings` - Update settings
  ```json
  {
    "currentWeek": 12
  }
  ```

## Data Storage

All data is stored in JSON files in the `server/data/` directory:

- **spreads.json**: Maps game IDs to spread objects
- **players.json**: Array of player objects with selections
- **settings.json**: App-wide settings

Files are automatically created on first run. Data persists across server restarts.

## Future Enhancements

Potential features to add:
- User authentication
- Score tracking and winner calculation
- Leaderboard and statistics
- Mobile app version
- PostgreSQL/MongoDB database
- Email notifications
- Live score updates
- Historical data and analytics

## ESPN API

This app uses the ESPN public API endpoint:
```
https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=YYYYMMDD-YYYYMMDD
```

The backend automatically calculates date ranges:
- Fetches games from last Thursday through next Monday
- Updates based on current day of the week

## Troubleshooting

**Issue**: Games not loading
- Check that the backend server is running on port 5000
- Verify internet connection (needed for ESPN API)
- Check console for API errors

**Issue**: Picks not saving
- Ensure spreads are set for games before making picks
- Check that player names are unique
- Verify server is running and accessible

**Issue**: Port already in use
- Backend (5000): Change PORT in `server/index.js`
- Frontend (3000): React will prompt to use different port

## License

MIT License - Feel free to use and modify for your pick 'em leagues!

## Credits

- Game data provided by ESPN API
- Fonts: Russo One, Oswald, Roboto (Google Fonts)
- Built with React and Express

---

**Ready to dominate your pick 'em league? Let's go! 🏈🔥**
