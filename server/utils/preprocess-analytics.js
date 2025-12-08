const fs = require('fs');
const path = require('path');

// Helper functions for statistical calculations
function calculateMean(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function findMaxWithDetails(coverMargins) {
  if (!coverMargins || coverMargins.length === 0) return null;
  let max = coverMargins[0];
  coverMargins.forEach(cm => {
    if (cm.margin > max.margin) max = cm;
  });
  return max;
}

function findMinWithDetails(coverMargins) {
  if (!coverMargins || coverMargins.length === 0) return null;
  let min = coverMargins[0];
  coverMargins.forEach(cm => {
    if (cm.margin < min.margin) min = cm;
  });
  return min;
}

/**
 * Calculate comprehensive analytics for a specific team
 */
function calculateTeamAnalytics(teamId, allGameResults, startWeek, endWeek) {
  const teamGames = [];

  // Collect all games for this team in the week range
  for (let week = startWeek; week <= endWeek; week++) {
    const weekGames = allGameResults[week.toString()];
    if (!weekGames) continue;

    for (const gameId in weekGames) {
      const game = weekGames[gameId];
      const isHomeTeam = game.homeTeam.id === teamId;
      const isAwayTeam = game.awayTeam.id === teamId;

      if (isHomeTeam || isAwayTeam) {
        teamGames.push({
          ...game,
          teamRole: isHomeTeam ? 'home' : 'away'
        });
      }
    }
  }

  // Initialize analytics structure
  const analytics = {
    gamesPlayed: teamGames.length,
    seasonRecord: {
      wins: 0,
      losses: 0,
      ties: 0
    },
    spreadRecord: {
      overall: { wins: 0, losses: 0, pushes: 0 },
      asFavorite: { wins: 0, losses: 0, pushes: 0 },
      asUnderdog: { wins: 0, losses: 0, pushes: 0 },
      atHome: { wins: 0, losses: 0, pushes: 0 },
      onRoad: { wins: 0, losses: 0, pushes: 0 }
    },
    coverMargins: {
      all: [],
      asFavorite: [],
      asUnderdog: [],
      atHome: [],
      onRoad: []
    },
    coverStats: {
      overall: {},
      favorite: {},
      underdog: {},
      home: {},
      road: {}
    },
    pointsStats: {
      scored: { all: [], home: [], road: [] },
      allowed: { all: [], home: [], road: [] }
    },
    weeklyPerformance: []
  };

  // Process each game
  teamGames.forEach(game => {
    const isHome = game.teamRole === 'home';
    const teamScore = isHome ? game.homeTeam.score : game.awayTeam.score;
    const opponentScore = isHome ? game.awayTeam.score : game.homeTeam.score;

    // Calculate actual game result (wins/losses/ties)
    const actualMargin = teamScore - opponentScore;
    if (actualMargin > 0) {
      analytics.seasonRecord.wins++;
    } else if (actualMargin < 0) {
      analytics.seasonRecord.losses++;
    } else {
      analytics.seasonRecord.ties++;
    }

    // Skip spread calculations if no spread data
    if (!game.spread || game.spread.value === null || game.spread.value === undefined) {
      return;
    }

    const isFavorite = game.spread.favoredTeam === teamId;

    // Calculate cover margin
    let coverMargin;
    if (isFavorite) {
      // Team is favored: need to win by more than spread
      coverMargin = actualMargin - game.spread.value;
    } else {
      // Team is underdog: need to lose by less than spread (or win)
      coverMargin = actualMargin + game.spread.value;
    }

    // Determine result
    let result;
    if (Math.abs(coverMargin) < 0.01) {
      result = 'push';
    } else if (coverMargin > 0) {
      result = 'win';
    } else {
      result = 'loss';
    }

    // Update records
    analytics.spreadRecord.overall[result === 'push' ? 'pushes' : result === 'win' ? 'wins' : 'losses']++;

    if (isFavorite) {
      analytics.spreadRecord.asFavorite[result === 'push' ? 'pushes' : result === 'win' ? 'wins' : 'losses']++;
    } else {
      analytics.spreadRecord.asUnderdog[result === 'push' ? 'pushes' : result === 'win' ? 'wins' : 'losses']++;
    }

    if (isHome) {
      analytics.spreadRecord.atHome[result === 'push' ? 'pushes' : result === 'win' ? 'wins' : 'losses']++;
    } else {
      analytics.spreadRecord.onRoad[result === 'push' ? 'pushes' : result === 'win' ? 'wins' : 'losses']++;
    }

    // Store cover margins (only for non-push results)
    if (result !== 'push') {
      const marginData = {
        value: coverMargin,
        week: game.week,
        opponent: isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation,
        covered: result === 'win'
      };

      analytics.coverMargins.all.push(marginData);

      if (isFavorite) {
        analytics.coverMargins.asFavorite.push(marginData);
      } else {
        analytics.coverMargins.asUnderdog.push(marginData);
      }

      if (isHome) {
        analytics.coverMargins.atHome.push(marginData);
      } else {
        analytics.coverMargins.onRoad.push(marginData);
      }
    }

    // Store points data
    analytics.pointsStats.scored.all.push(teamScore);
    analytics.pointsStats.allowed.all.push(opponentScore);

    if (isHome) {
      analytics.pointsStats.scored.home.push(teamScore);
      analytics.pointsStats.allowed.home.push(opponentScore);
    } else {
      analytics.pointsStats.scored.road.push(teamScore);
      analytics.pointsStats.allowed.road.push(opponentScore);
    }

    // Store weekly performance
    analytics.weeklyPerformance.push({
      week: game.week,
      opponent: isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation,
      location: isHome ? 'Home' : 'Away',
      teamScore: teamScore,
      opponentScore: opponentScore,
      spread: isFavorite ? -game.spread.value : game.spread.value,
      covered: result === 'win',
      push: result === 'push',
      coverMargin: coverMargin
    });
  });

  // Calculate cover statistics
  const calculateCoverStats = (margins) => {
    if (!margins || margins.length === 0) {
      return {
        mean: null,
        median: null,
        maxCover: null,
        maxMiss: null
      };
    }

    const values = margins.map(m => m.value);
    const covered = margins.filter(m => m.covered);
    const missed = margins.filter(m => !m.covered);

    return {
      mean: calculateMean(values),
      median: calculateMedian(values),
      maxCover: covered.length > 0 ? findMaxWithDetails(covered) : null,
      maxMiss: missed.length > 0 ? findMinWithDetails(missed) : null
    };
  };

  analytics.coverStats.overall = calculateCoverStats(analytics.coverMargins.all);
  analytics.coverStats.favorite = calculateCoverStats(analytics.coverMargins.asFavorite);
  analytics.coverStats.underdog = calculateCoverStats(analytics.coverMargins.asUnderdog);
  analytics.coverStats.home = calculateCoverStats(analytics.coverMargins.atHome);
  analytics.coverStats.road = calculateCoverStats(analytics.coverMargins.onRoad);

  // Calculate points statistics
  const calculatePointsStats = (points) => {
    if (!points || points.length === 0) {
      return { mean: null, median: null, max: null, min: null };
    }
    return {
      mean: calculateMean(points),
      median: calculateMedian(points),
      max: Math.max(...points),
      min: Math.min(...points)
    };
  };

  analytics.pointsStats.scored.stats = calculatePointsStats(analytics.pointsStats.scored.all);
  analytics.pointsStats.scored.homeStats = calculatePointsStats(analytics.pointsStats.scored.home);
  analytics.pointsStats.scored.roadStats = calculatePointsStats(analytics.pointsStats.scored.road);

  analytics.pointsStats.allowed.stats = calculatePointsStats(analytics.pointsStats.allowed.all);
  analytics.pointsStats.allowed.homeStats = calculatePointsStats(analytics.pointsStats.allowed.home);
  analytics.pointsStats.allowed.roadStats = calculatePointsStats(analytics.pointsStats.allowed.road);

  // Sort weekly performance by week
  analytics.weeklyPerformance.sort((a, b) => a.week - b.week);

  // Flatten spread records and add percentage calculations for component compatibility
  const calculatePercentage = (wins, losses) => {
    const total = wins + losses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  };

  // Store references before overwriting
  const overall = analytics.spreadRecord.overall;
  const asFavorite = analytics.spreadRecord.asFavorite;
  const asUnderdog = analytics.spreadRecord.asUnderdog;
  const atHome = analytics.spreadRecord.atHome;
  const onRoad = analytics.spreadRecord.onRoad;

  // Create flattened records with percentage
  analytics.spreadRecord = {
    ...overall,
    percentage: calculatePercentage(overall.wins, overall.losses)
  };

  analytics.favoriteRecord = {
    ...asFavorite,
    percentage: calculatePercentage(asFavorite.wins, asFavorite.losses)
  };

  analytics.underdogRecord = {
    ...asUnderdog,
    percentage: calculatePercentage(asUnderdog.wins, asUnderdog.losses)
  };

  analytics.homeRecord = {
    ...atHome,
    percentage: calculatePercentage(atHome.wins, atHome.losses)
  };

  analytics.awayRecord = {
    ...onRoad,
    percentage: calculatePercentage(onRoad.wins, onRoad.losses)
  };

  // Add weeklyData for compatibility and map field names
  analytics.weeklyData = analytics.weeklyPerformance.map(week => ({
    ...week,
    pointsScored: week.teamScore,
    pointsAllowed: week.opponentScore,
    isHome: week.location === 'Home',
    isFavorite: week.spread < 0
  }));

  // Add totalGames for radar chart
  analytics.totalGames = analytics.gamesPlayed;

  // Add mean to top-level pointsStats for easy access
  analytics.pointsStats.scored.mean = analytics.pointsStats.scored.stats.mean;
  analytics.pointsStats.allowed.mean = analytics.pointsStats.allowed.stats.mean;

  // Add formatted season record string (e.g., "8-4-0" or "10-5-1")
  analytics.seasonRecord.formatted = `${analytics.seasonRecord.wins}-${analytics.seasonRecord.losses}${analytics.seasonRecord.ties > 0 ? `-${analytics.seasonRecord.ties}` : ''}`;
  analytics.seasonRecord.percentage = calculatePercentage(analytics.seasonRecord.wins, analytics.seasonRecord.losses)
  return analytics;
}

/**
 * Pre-process all analytics and save to file
 */
function preprocessAllAnalytics() {
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const GAME_RESULTS_FILE = path.join(DATA_DIR, 'game-results-by-week.json');
  const OUTPUT_FILE = path.join(DATA_DIR, 'team-analytics.json');

  console.log('📊 Starting analytics pre-processing...');

  // Read game results
  let allGameResults;
  try {
    const data = fs.readFileSync(GAME_RESULTS_FILE, 'utf8');
    allGameResults = JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading game results:', error.message);
    return false;
  }

  // Collect all unique team IDs with their names
  const teamsMap = new Map();

  for (const week in allGameResults) {
    const weekGames = allGameResults[week];
    for (const gameId in weekGames) {
      const game = weekGames[gameId];

      if (!teamsMap.has(game.homeTeam.id)) {
        teamsMap.set(game.homeTeam.id, {
          id: game.homeTeam.id,
          name: game.homeTeam.name,
          abbreviation: game.homeTeam.abbreviation,
          color: game.homeTeam.color,
          alternateColor: game.homeTeam.alternateColor
        });
      }

      if (!teamsMap.has(game.awayTeam.id)) {
        teamsMap.set(game.awayTeam.id, {
          id: game.awayTeam.id,
          name: game.awayTeam.name,
          abbreviation: game.awayTeam.abbreviation,
          color: game.awayTeam.color,
          alternateColor: game.awayTeam.alternateColor
        });
      }
    }
  }

  console.log(`Found ${teamsMap.size} teams`);

  // Determine week range
  const weeks = Object.keys(allGameResults).map(w => parseInt(w)).filter(w => !isNaN(w));
  const minWeek = Math.min(...weeks);
  const maxWeek = Math.max(...weeks);

  console.log(`Processing weeks ${minWeek} to ${maxWeek}`);

  // Calculate analytics for each team
  const teamAnalytics = {};
  let processedCount = 0;

  for (const [teamId, teamInfo] of teamsMap) {
    const analytics = calculateTeamAnalytics(teamId, allGameResults, minWeek, maxWeek);

    teamAnalytics[teamId] = {
      teamInfo,
      analytics,
      lastUpdated: new Date().toISOString(),
      weekRange: { start: minWeek, end: maxWeek }
    };

    processedCount++;
    if (processedCount % 5 === 0) {
      console.log(`Processed ${processedCount}/${teamsMap.size} teams...`);
    }
  }

  // Save to file
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(teamAnalytics, null, 2));
    console.log(`✅ Successfully saved analytics for ${teamsMap.size} teams to ${OUTPUT_FILE}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving analytics:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  preprocessAllAnalytics();
}

module.exports = { preprocessAllAnalytics, calculateTeamAnalytics };
