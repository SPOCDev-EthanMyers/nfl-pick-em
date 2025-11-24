const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const SPREADS_FILE = path.join(DATA_DIR, 'spreads-by-week.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'players-by-week.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const WEEKS_FILE = path.join(DATA_DIR, 'weeks.json');

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
initDataFile(PLAYERS_FILE, {});
initDataFile(SETTINGS_FILE, { currentWeek: 1 });
initDataFile(WEEKS_FILE, []);

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

// Helper function to get week date range by week number
function getWeekDateRange(weekNumber) {
  const weeks = readJsonFile(WEEKS_FILE);
  const week = weeks.find(w => w.week === parseInt(weekNumber));

  if (!week) {
    throw new Error(`Week ${weekNumber} not found`);
  }

  return {
    startDate: week.start,
    endDate: week.end
  };
}

// API Routes

// GET /api/weeks - Get all week mappings
app.get('/api/weeks', (req, res) => {
  const weeks = readJsonFile(WEEKS_FILE);
  res.json(weeks || []);
});

// GET /api/games - Fetch NFL games from ESPN API for a specific week
app.get('/api/games', async (req, res) => {
  try {
    const week = req.query.week || 1;
    const { startDate, endDate } = getWeekDateRange(week);
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${startDate}-${endDate}`;

    console.log(`Fetching games for week ${week} from ESPN API: ${url}`);
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

// GET /api/spreads - Get spreads for a specific week
app.get('/api/spreads', (req, res) => {
  const week = req.query.week || 1;
  const allSpreads = readJsonFile(SPREADS_FILE) || {};
  const weekSpreads = allSpreads[week] || {};
  res.json(weekSpreads);
});

// POST /api/spreads - Update spreads for a game in a specific week
app.post('/api/spreads', (req, res) => {
  const { gameId, spread, favoredTeam, week } = req.body;

  if (!gameId || !week) {
    return res.status(400).json({ error: 'gameId and week are required' });
  }

  const allSpreads = readJsonFile(SPREADS_FILE) || {};

  // Initialize week if it doesn't exist
  if (!allSpreads[week]) {
    allSpreads[week] = {};
  }

  allSpreads[week][gameId] = { spread, favoredTeam };

  if (writeJsonFile(SPREADS_FILE, allSpreads)) {
    res.json({ success: true, spreads: allSpreads[week] });
  } else {
    res.status(500).json({ error: 'Failed to save spreads' });
  }
});

// GET /api/players - Get players and their selections for a specific week
app.get('/api/players', (req, res) => {
  const week = req.query.week || 1;
  const allPlayers = readJsonFile(PLAYERS_FILE) || {};
  const weekPlayers = allPlayers[week] || [];
  res.json(weekPlayers);
});

// POST /api/players - Add or update a player for a specific week
app.post('/api/players', (req, res) => {
  const { name, selections, week } = req.body;

  if (!name || !week) {
    return res.status(400).json({ error: 'Player name and week are required' });
  }

  const allPlayers = readJsonFile(PLAYERS_FILE) || {};

  // Initialize week if it doesn't exist
  if (!allPlayers[week]) {
    allPlayers[week] = [];
  }

  const players = allPlayers[week];
  const existingPlayerIndex = players.findIndex(p => p.name === name);

  if (existingPlayerIndex >= 0) {
    // Update existing player
    players[existingPlayerIndex] = { name, selections: selections || {} };
  } else {
    // Add new player
    players.push({ name, selections: selections || {} });
  }

  if (writeJsonFile(PLAYERS_FILE, allPlayers)) {
    res.json({ success: true, players: allPlayers[week] });
  } else {
    res.status(500).json({ error: 'Failed to save player' });
  }
});

// PUT /api/players/:name/selection - Update a player's selection for a game in a specific week
app.put('/api/players/:name/selection', (req, res) => {
  const { name } = req.params;
  const { gameId, teamId, week } = req.body;

  if (!gameId || !week) {
    return res.status(400).json({ error: 'gameId and week are required' });
  }

  const allPlayers = readJsonFile(PLAYERS_FILE) || {};

  // Initialize week if it doesn't exist
  if (!allPlayers[week]) {
    allPlayers[week] = [];
  }

  const players = allPlayers[week];
  const player = players.find(p => p.name === name);

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  if (!player.selections) {
    player.selections = {};
  }

  player.selections[gameId] = teamId;

  if (writeJsonFile(PLAYERS_FILE, allPlayers)) {
    res.json({ success: true, player });
  } else {
    res.status(500).json({ error: 'Failed to update selection' });
  }
});

// DELETE /api/players/:name - Delete a player from a specific week
app.delete('/api/players/:name', (req, res) => {
  const { name } = req.params;
  const week = req.query.week || 1;

  const allPlayers = readJsonFile(PLAYERS_FILE) || {};

  if (!allPlayers[week]) {
    return res.status(404).json({ error: 'Week not found' });
  }

  const filteredPlayers = allPlayers[week].filter(p => p.name !== name);
  allPlayers[week] = filteredPlayers;

  if (writeJsonFile(PLAYERS_FILE, allPlayers)) {
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
