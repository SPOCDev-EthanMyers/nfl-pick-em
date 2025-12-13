const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const SPREADS_FILE = path.join(DATA_DIR, 'spreads-by-week.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'players-by-week.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const WEEKS_FILE = path.join(DATA_DIR, 'weeks.json');
const GAME_RESULTS_FILE = path.join(DATA_DIR, 'game-results-by-week.json');
const TEAM_ANALYTICS_FILE = path.join(DATA_DIR, 'team-analytics.json');

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
initDataFile(GAME_RESULTS_FILE, {});

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

    // Persist game results if any games are complete
    const allGameResults = readJsonFile(GAME_RESULTS_FILE) || {};
    const spreads = readJsonFile(SPREADS_FILE) || {};
    const weekSpreads = spreads[week] || {};

    // Initialize week if doesn't exist
    if (!allGameResults[week]) {
      allGameResults[week] = {};
    }

    let savedCount = 0;
    games.forEach(game => {
      const isComplete = game.status === 'Final' || game.status === 'Final/OT';
      // Check if scores exist and are valid (even "0" is valid)
      const hasValidScores = game.homeTeam.score !== undefined &&
                            game.homeTeam.score !== null &&
                            game.awayTeam.score !== undefined &&
                            game.awayTeam.score !== null;

      if (isComplete && hasValidScores) {
        const spread = weekSpreads[game.id];
        allGameResults[week][game.id] = {
          gameId: game.id,
          week: parseInt(week),
          date: game.date,
          homeTeam: {
            id: game.homeTeam.id,
            name: game.homeTeam.name,
            abbreviation: game.homeTeam.abbreviation,
            score: parseFloat(game.homeTeam.score),
            color: game.homeTeam.color,
            alternateColor: game.homeTeam.alternateColor
          },
          awayTeam: {
            id: game.awayTeam.id,
            name: game.awayTeam.name,
            abbreviation: game.awayTeam.abbreviation,
            score: parseFloat(game.awayTeam.score),
            color: game.awayTeam.color,
            alternateColor: game.awayTeam.alternateColor
          },
          spread: spread ? {
            value: parseFloat(spread.spread),
            favoredTeam: spread.favoredTeam
          } : null
        };
        savedCount++;
      }
    });

    // Write results to file only if we have data to save
    if (Object.keys(allGameResults[week]).length > 0) {
      writeJsonFile(GAME_RESULTS_FILE, allGameResults);
      console.log(`💾 Saved ${savedCount} completed game(s) for week ${week}`);
    }

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

// GET /api/analytics/game/:gameId - Get analytics for both teams in a game
app.get('/api/analytics/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  const week = req.query.week || 1;
  const homeTeamId = req.query.homeTeamId;
  const awayTeamId = req.query.awayTeamId;
  const homeTeamName = req.query.homeTeamName;
  const awayTeamName = req.query.awayTeamName;
  const homeTeamAbbr = req.query.homeTeamAbbr;
  const awayTeamAbbr = req.query.awayTeamAbbr;
  const homeTeamColor = req.query.homeTeamColor;
  const awayTeamColor = req.query.awayTeamColor;
  const homeTeamAlternateColor = req.query.homeTeamAlternateColor;
  const awayTeamAlternateColor = req.query.awayTeamAlternateColor;

  try {
    const allGameResults = readJsonFile(GAME_RESULTS_FILE) || {};
    const teamAnalytics = readJsonFile(TEAM_ANALYTICS_FILE) || {};
    const spreads = readJsonFile(SPREADS_FILE) || {};
    const weekSpreads = spreads[week] || {};

    // Try to find the game in stored results first
    let currentGame = null;
    for (let w in allGameResults) {
      if (allGameResults[w][gameId]) {
        currentGame = allGameResults[w][gameId];
        break;
      }
    }

    // Determine team IDs and info
    let finalHomeTeamId, finalAwayTeamId, finalHomeTeamName, finalAwayTeamName, finalHomeTeamAbbr, finalAwayTeamAbbr, finalHomeTeamColor, finalAwayTeamColor, finalHomeTeamAlternateColor, finalAwayTeamAlternateColor;
    let currentSpread = weekSpreads[gameId] || null;

    if (currentGame) {
      finalHomeTeamId = currentGame.homeTeam.id;
      finalAwayTeamId = currentGame.awayTeam.id;
      finalHomeTeamName = currentGame.homeTeam.name;
      finalAwayTeamName = currentGame.awayTeam.name;
      finalHomeTeamAbbr = currentGame.homeTeam.abbreviation;
      finalAwayTeamAbbr = currentGame.awayTeam.abbreviation;
      finalHomeTeamColor = currentGame.homeTeam.color;
      finalAwayTeamColor = currentGame.awayTeam.color;
      finalHomeTeamAlternateColor = currentGame.homeTeam.alternateColor;
      finalAwayTeamAlternateColor = currentGame.awayTeam.alternateColor;
      currentSpread = currentGame.spread;
    } else if (homeTeamId && awayTeamId) {
      // Use provided team information for upcoming games
      finalHomeTeamId = homeTeamId;
      finalAwayTeamId = awayTeamId;
      finalHomeTeamName = homeTeamName || 'Home Team';
      finalAwayTeamName = awayTeamName || 'Away Team';
      finalHomeTeamAbbr = homeTeamAbbr || 'HOME';
      finalAwayTeamAbbr = awayTeamAbbr || 'AWAY';
      finalHomeTeamColor = homeTeamColor;
      finalAwayTeamColor = awayTeamColor;
      finalHomeTeamAlternateColor = homeTeamAlternateColor;
      finalAwayTeamAlternateColor = awayTeamAlternateColor
    } else {
      return res.status(404).json({ error: 'Game not found and team IDs not provided' });
    }

    // Fetch pre-processed analytics for both teams
    const homeTeamData = teamAnalytics[finalHomeTeamId];
    const awayTeamData = teamAnalytics[finalAwayTeamId];

    if (!homeTeamData || !awayTeamData) {
      return res.status(404).json({
        error: 'Analytics not found for one or both teams. Run preprocess-analytics.js to generate analytics.'
      });
    }

    res.json({
      gameId,
      currentWeek: parseInt(week),
      analysisRange: homeTeamData.weekRange,
      homeTeam: {
        id: finalHomeTeamId,
        name: finalHomeTeamName,
        abbreviation: finalHomeTeamAbbr,
        color: finalHomeTeamColor,
        alternateColor: finalHomeTeamAlternateColor,
        analytics: homeTeamData.analytics
      },
      awayTeam: {
        id: finalAwayTeamId,
        name: finalAwayTeamName,
        abbreviation: finalAwayTeamAbbr,
        color: finalAwayTeamColor,
        alternateColor: finalAwayTeamAlternateColor,
        analytics: awayTeamData.analytics
      },
      currentSpread: currentSpread
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/team/:teamId - Get analytics for a specific team
app.get('/api/analytics/team/:teamId', (req, res) => {
  const { teamId } = req.params;

  try {
    const teamAnalytics = readJsonFile(TEAM_ANALYTICS_FILE) || {};
    const teamData = teamAnalytics[teamId];

    if (!teamData) {
      return res.status(404).json({
        error: 'Analytics not found for team. Run preprocess-analytics.js to generate analytics.'
      });
    }

    res.json({
      teamId,
      analysisRange: teamData.weekRange,
      teamInfo: teamData.teamInfo,
      analytics: teamData.analytics
    });
  } catch (error) {
    console.error('Error fetching team analytics:', error);
    res.status(500).json({ error: 'Failed to fetch team analytics' });
  }
});

// Import backtest utilities
const { backtestGame, backtestWeekRange } = require('./utils/backtest-analytics');
const { generateWeeklySummary } = require('./utils/weekly-summary');

// GET /api/backtest/game/:week/:gameId - Backtest a specific completed game
app.get('/api/backtest/game/:week/:gameId', (req, res) => {
  const { week, gameId } = req.params;

  try {
    const allGameResults = readJsonFile(GAME_RESULTS_FILE) || {};
    const result = backtestGame(parseInt(week), gameId, allGameResults);

    if (result.error) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error backtesting game:', error);
    res.status(500).json({ error: 'Failed to backtest game' });
  }
});

// GET /api/backtest/range - Backtest a range of weeks
app.get('/api/backtest/range', (req, res) => {
  const startWeek = parseInt(req.query.startWeek) || 1;
  const endWeek = parseInt(req.query.endWeek) || 1;

  try {
    const allGameResults = readJsonFile(GAME_RESULTS_FILE) || {};
    const result = backtestWeekRange(startWeek, endWeek, allGameResults);

    res.json(result);
  } catch (error) {
    console.error('Error backtesting week range:', error);
    res.status(500).json({ error: 'Failed to backtest week range' });
  }
});

// GET /api/backtest/weeks - Get all available weeks with completed games
app.get('/api/backtest/weeks', (_req, res) => {
  try {
    const allGameResults = readJsonFile(GAME_RESULTS_FILE) || {};
    const weeks = Object.keys(allGameResults)
      .map(w => parseInt(w))
      .filter(w => !isNaN(w))
      .sort((a, b) => a - b);

    const weekInfo = weeks.map(week => {
      const weekGames = allGameResults[week.toString()];
      const gameCount = Object.keys(weekGames).length;
      const games = Object.entries(weekGames).map(([gameId, game]) => ({
        gameId,
        homeTeam: {
          abbreviation: game.homeTeam.abbreviation,
          score: game.homeTeam.score
        },
        awayTeam: {
          abbreviation: game.awayTeam.abbreviation,
          score: game.awayTeam.score
        },
        date: game.date,
        spread: game.spread
      }));

      return {
        week,
        gameCount,
        games
      };
    });

    res.json({
      weeks: weekInfo,
      totalWeeks: weeks.length,
      totalGames: weekInfo.reduce((sum, w) => sum + w.gameCount, 0)
    });
  } catch (error) {
    console.error('Error fetching backtest weeks:', error);
    res.status(500).json({ error: 'Failed to fetch backtest weeks' });
  }
});

// GET /api/summary/week/:week - Get comprehensive weekly summary
app.get('/api/summary/week/:week', async (req, res) => {
  const week = parseInt(req.params.week);

  try {
    const allGameResults = readJsonFile(GAME_RESULTS_FILE) || {};
    const teamAnalytics = readJsonFile(TEAM_ANALYTICS_FILE) || {};
    const spreads = readJsonFile(SPREADS_FILE) || {};

    // Also fetch current week's games from ESPN for upcoming games
    const { startDate, endDate } = getWeekDateRange(week);
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${startDate}-${endDate}`;

    let currentWeekGames = {};
    try {
      const espnResponse = await axios.get(url);
      currentWeekGames = espnResponse.data.events.reduce((acc, event) => {
        const competition = event.competitions[0];
        const homeTeam = competition.competitors.find(t => t.homeAway === 'home');
        const awayTeam = competition.competitors.find(t => t.homeAway === 'away');

        acc[event.id] = {
          id: event.id,
          homeTeam: {
            id: homeTeam.team.id,
            name: homeTeam.team.displayName,
            abbreviation: homeTeam.team.abbreviation,
            score: parseInt(homeTeam.score) || undefined
          },
          awayTeam: {
            id: awayTeam.team.id,
            name: awayTeam.team.displayName,
            abbreviation: awayTeam.team.abbreviation,
            score: parseInt(awayTeam.score) || undefined
          },
          status: event.status.type.state
        };
        return acc;
      }, {});
    } catch (espnError) {
      console.log('Could not fetch ESPN data for week', week);
    }

    const summary = await generateWeeklySummary(week, allGameResults, teamAnalytics, spreads, currentWeekGames);

    res.json(summary);
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    res.status(500).json({ error: 'Failed to generate weekly summary' });
  }
});

// Catch-all handler: serve React app for any route not handled by API
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🏈 NFL Pick 'Em Server running on http://localhost:${PORT}`);
});
