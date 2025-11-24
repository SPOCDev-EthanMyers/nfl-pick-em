const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const SPREADS_FILE = path.join(DATA_DIR, 'spreads.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files if they don't exist
function initDataFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initDataFile(SPREADS_FILE, {});
initDataFile(PLAYERS_FILE, []);
initDataFile(SETTINGS_FILE, { currentWeek: 1 });

// Helper function to read JSON file
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

// Helper function to write JSON file
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

// Helper function to calculate date range for NFL week
// Returns Thursday - Monday range based on current day
function getWeekDateRange() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.

  let thursday, monday;

  switch (dayOfWeek) {
    case 2: // Tuesday - Get upcoming Thursday - Monday
      thursday = new Date(today);
      thursday.setDate(today.getDate() + 2); // Next Thursday
      monday = new Date(thursday);
      monday.setDate(thursday.getDate() + 4); // Following Monday
      break;

    case 3: // Wednesday - Get upcoming Thursday - Monday
      thursday = new Date(today);
      thursday.setDate(today.getDate() + 1); // Next Thursday (tomorrow)
      monday = new Date(thursday);
      monday.setDate(thursday.getDate() + 4); // Following Monday
      break;

    case 4: // Thursday - Get current Thursday - Monday
      thursday = new Date(today); // Today (Thursday)
      monday = new Date(thursday);
      monday.setDate(thursday.getDate() + 4); // This coming Monday
      break;

    case 5: // Friday - Get yesterday's Thursday - Monday
      thursday = new Date(today);
      thursday.setDate(today.getDate() - 1); // Yesterday (Thursday)
      monday = new Date(thursday);
      monday.setDate(thursday.getDate() + 4); // This coming Monday
      break;

    case 6: // Saturday - Get recent Thursday - Monday
      thursday = new Date(today);
      thursday.setDate(today.getDate() - 2); // Last Thursday
      monday = new Date(thursday);
      monday.setDate(thursday.getDate() + 4); // This coming Monday
      break;

    case 0: // Sunday - Get recent Thursday - Monday
      thursday = new Date(today);
      thursday.setDate(today.getDate() - 3); // Last Thursday
      monday = new Date(thursday);
      monday.setDate(thursday.getDate() + 4); // Tomorrow (Monday)
      break;

    case 1: // Monday - Get recent Thursday - Current Monday
      thursday = new Date(today);
      thursday.setDate(today.getDate() - 4); // Last Thursday
      monday = new Date(today); // Today (Monday)
      break;

    default:
      // Fallback (shouldn't happen)
      thursday = new Date(today);
      monday = new Date(today);
  }

  // Format dates as YYYYMMDD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  return {
    startDate: formatDate(thursday),
    endDate: formatDate(monday)
  };
}

// API Routes

// GET /api/games - Fetch NFL games from ESPN API
app.get('/api/games', async (req, res) => {
  try {
    const { startDate, endDate } = getWeekDateRange();
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${startDate}-${endDate}`;

    console.log(`Fetching games from ESPN API: ${url}`);
    const response = await axios.get(url);

    // Transform ESPN data to simpler format based on actual API structure
    const games = response.data.events.map(event => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find(t => t.homeAway === 'home');
      const awayTeam = competition.competitors.find(t => t.homeAway === 'away');
      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: event.date,
        status: competition.status.type.description,
        statusDetail: competition.status.type.shortDetail,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.team.displayName,
          abbreviation: homeTeam.team.abbreviation,
          color: homeTeam.team.color,
          alternateColor: homeTeam.team.alternateColor,
          score: homeTeam.score,
          record: homeTeam.record?.displayValue || ''
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.team.displayName,
          abbreviation: awayTeam.team.abbreviation,
          color: awayTeam.team.color,
          alternateColor: awayTeam.team.alternateColor,
          score: awayTeam.score,
          record: awayTeam.record?.displayValue || ''
        }
      };
    });

    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error.message);
    res.status(500).json({ error: 'Failed to fetch games from ESPN API' });
  }
});

// GET /api/spreads - Get all spreads
app.get('/api/spreads', (req, res) => {
  const spreads = readJsonFile(SPREADS_FILE);
  res.json(spreads || {});
});

// POST /api/spreads - Update spreads for a game
app.post('/api/spreads', (req, res) => {
  const { gameId, spread, favoredTeam } = req.body;

  if (!gameId) {
    return res.status(400).json({ error: 'gameId is required' });
  }

  const spreads = readJsonFile(SPREADS_FILE) || {};
  spreads[gameId] = { spread, favoredTeam };

  if (writeJsonFile(SPREADS_FILE, spreads)) {
    res.json({ success: true, spreads });
  } else {
    res.status(500).json({ error: 'Failed to save spreads' });
  }
});

// GET /api/players - Get all players and their selections
app.get('/api/players', (req, res) => {
  const players = readJsonFile(PLAYERS_FILE);
  res.json(players || []);
});

// POST /api/players - Add or update a player
app.post('/api/players', (req, res) => {
  const { name, selections } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  const players = readJsonFile(PLAYERS_FILE) || [];
  const existingPlayerIndex = players.findIndex(p => p.name === name);

  if (existingPlayerIndex >= 0) {
    // Update existing player
    players[existingPlayerIndex] = { name, selections: selections || {} };
  } else {
    // Add new player
    players.push({ name, selections: selections || {} });
  }

  if (writeJsonFile(PLAYERS_FILE, players)) {
    res.json({ success: true, players });
  } else {
    res.status(500).json({ error: 'Failed to save player' });
  }
});

// PUT /api/players/:name/selection - Update a player's selection for a game
app.put('/api/players/:name/selection', (req, res) => {
  const { name } = req.params;
  const { gameId, teamId } = req.body;

  if (!gameId) {
    return res.status(400).json({ error: 'gameId is required' });
  }

  const players = readJsonFile(PLAYERS_FILE) || [];
  const player = players.find(p => p.name === name);

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  if (!player.selections) {
    player.selections = {};
  }

  player.selections[gameId] = teamId;

  if (writeJsonFile(PLAYERS_FILE, players)) {
    res.json({ success: true, player });
  } else {
    res.status(500).json({ error: 'Failed to update selection' });
  }
});

// DELETE /api/players/:name - Delete a player
app.delete('/api/players/:name', (req, res) => {
  const { name } = req.params;
  const players = readJsonFile(PLAYERS_FILE) || [];
  const filteredPlayers = players.filter(p => p.name !== name);

  if (writeJsonFile(PLAYERS_FILE, filteredPlayers)) {
    res.json({ success: true, players: filteredPlayers });
  } else {
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

// GET /api/settings - Get app settings
app.get('/api/settings', (req, res) => {
  const settings = readJsonFile(SETTINGS_FILE);
  res.json(settings || { currentWeek: 1 });
});

// POST /api/settings - Update app settings
app.post('/api/settings', (req, res) => {
  const { currentWeek } = req.body;

  if (currentWeek === undefined) {
    return res.status(400).json({ error: 'currentWeek is required' });
  }

  const settings = { currentWeek };

  if (writeJsonFile(SETTINGS_FILE, settings)) {
    res.json({ success: true, settings });
  } else {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🏈 NFL Pick 'Em Server running on http://localhost:${PORT}`);
});
