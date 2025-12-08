const fs = require('fs');
const path = require('path');

/**
 * Calculate metric values for a team at a specific point in time
 * This gives us the team's stats UP TO but NOT INCLUDING the target week
 */
function calculateTeamMetricsAtWeek(teamId, targetWeek, allGameResults) {
  const teamGames = [];

  // Collect all games for this team BEFORE the target week
  for (let week = 1; week < targetWeek; week++) {
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

  if (teamGames.length === 0) {
    return null; // Not enough historical data
  }

  // Calculate metrics based on historical games
  let spreadWins = 0, spreadLosses = 0, spreadPushes = 0;
  let favoriteWins = 0, favoriteLosses = 0;
  let underdogWins = 0, underdogLosses = 0;
  let homeWins = 0, homeLosses = 0;
  let awayWins = 0, awayLosses = 0;
  let pointsScored = [], pointsAllowed = [];
  let coverMargins = [];
  let seasonWins = 0, seasonLosses = 0;

  teamGames.forEach(game => {
    const isHome = game.teamRole === 'home';
    const teamScore = isHome ? game.homeTeam.score : game.awayTeam.score;
    const opponentScore = isHome ? game.awayTeam.score : game.homeTeam.score;
    const actualMargin = teamScore - opponentScore;

    // Season record
    if (actualMargin > 0) seasonWins++;
    else if (actualMargin < 0) seasonLosses++;

    // Points
    pointsScored.push(teamScore);
    pointsAllowed.push(opponentScore);

    // Spread analysis
    if (game.spread && game.spread.value !== null) {
      const isFavorite = game.spread.favoredTeam === teamId;
      const coverMargin = isFavorite
        ? actualMargin - game.spread.value
        : actualMargin + game.spread.value;

      let result;
      if (Math.abs(coverMargin) < 0.01) result = 'push';
      else if (coverMargin > 0) result = 'win';
      else result = 'loss';

      // Overall spread record
      if (result === 'win') spreadWins++;
      else if (result === 'loss') spreadLosses++;
      else spreadPushes++;

      // Context-specific records
      if (isFavorite) {
        if (result === 'win') favoriteWins++;
        else if (result === 'loss') favoriteLosses++;
      } else {
        if (result === 'win') underdogWins++;
        else if (result === 'loss') underdogLosses++;
      }

      if (isHome) {
        if (result === 'win') homeWins++;
        else if (result === 'loss') homeLosses++;
      } else {
        if (result === 'win') awayWins++;
        else if (result === 'loss') awayLosses++;
      }

      if (result !== 'push') {
        coverMargins.push(coverMargin);
      }
    }
  });

  // Calculate statistics
  const avgPointsScored = pointsScored.reduce((a, b) => a + b, 0) / pointsScored.length;
  const avgPointsAllowed = pointsAllowed.reduce((a, b) => a + b, 0) / pointsAllowed.length;
  const avgCoverMargin = coverMargins.length > 0
    ? coverMargins.reduce((a, b) => a + b, 0) / coverMargins.length
    : 0;

  const spreadTotal = spreadWins + spreadLosses;
  const favoriteTotal = favoriteWins + favoriteLosses;
  const underdogTotal = underdogWins + underdogLosses;
  const homeTotal = homeWins + homeLosses;
  const awayTotal = awayWins + awayLosses;

  return {
    gamesPlayed: teamGames.length,
    spreadWinPct: spreadTotal > 0 ? (spreadWins / spreadTotal) * 100 : 0,
    favoriteWinPct: favoriteTotal > 0 ? (favoriteWins / favoriteTotal) * 100 : 0,
    underdogWinPct: underdogTotal > 0 ? (underdogWins / underdogTotal) * 100 : 0,
    homeWinPct: homeTotal > 0 ? (homeWins / homeTotal) * 100 : 0,
    awayWinPct: awayTotal > 0 ? (awayWins / awayTotal) * 100 : 0,
    avgPointsScored,
    avgPointsAllowed,
    avgCoverMargin,
    pointDifferential: avgPointsScored - avgPointsAllowed,
    seasonWinPct: (seasonWins + seasonLosses) > 0
      ? (seasonWins / (seasonWins + seasonLosses)) * 100
      : 0,
    // Recent form (last 3 games if available)
    recentForm: calculateRecentForm(teamGames.slice(-3))
  };
}

/**
 * Calculate recent performance metrics
 */
function calculateRecentForm(recentGames) {
  if (recentGames.length === 0) return { avgPoints: 0, avgAllowed: 0, spreadWins: 0 };

  let points = 0, allowed = 0, spreadWins = 0;

  recentGames.forEach(game => {
    const isHome = game.teamRole === 'home';
    const teamScore = isHome ? game.homeTeam.score : game.awayTeam.score;
    const oppScore = isHome ? game.awayTeam.score : game.homeTeam.score;

    points += teamScore;
    allowed += oppScore;

    // Check if covered spread
    if (game.spread && game.spread.value !== null) {
      const teamId = isHome ? game.homeTeam.id : game.awayTeam.id;
      const isFavorite = game.spread.favoredTeam === teamId;
      const actualMargin = teamScore - oppScore;
      const coverMargin = isFavorite
        ? actualMargin - game.spread.value
        : actualMargin + game.spread.value;

      if (coverMargin > 0.01) spreadWins++;
    }
  });

  return {
    avgPoints: points / recentGames.length,
    avgAllowed: allowed / recentGames.length,
    spreadWins
  };
}

/**
 * Analyze a completed game to determine which metrics predicted the winner
 * Returns metric correlations and importance scores
 */
function analyzeCompletedGame(gameData, homeMetrics, awayMetrics) {
  const { homeTeam, awayTeam, spread } = gameData;
  const actualMargin = homeTeam.score - awayTeam.score;

  // Determine who was favored and who covered
  const homeWasFavored = spread.favoredTeam === homeTeam.id;
  const awayWasFavored = spread.favoredTeam === awayTeam.id;

  const homeCoverMargin = homeWasFavored
    ? actualMargin - spread.value
    : actualMargin + spread.value;

  const awayCoverMargin = awayWasFavored
    ? -actualMargin - spread.value
    : -actualMargin + spread.value;

  const homeCovered = homeCoverMargin > 0.01;
  const awayCovered = awayCoverMargin > 0.01;
  const push = Math.abs(homeCoverMargin) < 0.01;

  // Winner analysis (who should have been picked)
  let correctPick = push ? 'push' : (homeCovered ? 'home' : 'away');
  let winnerTeam = correctPick === 'home' ? homeTeam : awayTeam;
  let loserTeam = correctPick === 'home' ? awayTeam : homeTeam;
  let winnerMetrics = correctPick === 'home' ? homeMetrics : awayMetrics;
  let loserMetrics = correctPick === 'home' ? awayMetrics : homeMetrics;

  if (push) {
    return {
      isPush: true,
      spread: spread.value,
      actualMargin,
      metricCorrelations: []
    };
  }

  // Calculate which metrics favored the winner
  const metricCorrelations = [];

  // Compare each metric
  const metrics = [
    {
      name: 'Spread Win %',
      winner: winnerMetrics.spreadWinPct,
      loser: loserMetrics.spreadWinPct,
      higherIsBetter: true,
      category: 'spread'
    },
    {
      name: 'Favorite Win %',
      winner: winnerMetrics.favoriteWinPct,
      loser: loserMetrics.favoriteWinPct,
      higherIsBetter: true,
      category: 'spread',
      contextual: true,
      applies: (correctPick === 'home' && homeWasFavored) || (correctPick === 'away' && awayWasFavored)
    },
    {
      name: 'Underdog Win %',
      winner: winnerMetrics.underdogWinPct,
      loser: loserMetrics.underdogWinPct,
      higherIsBetter: true,
      category: 'spread',
      contextual: true,
      applies: (correctPick === 'home' && !homeWasFavored) || (correctPick === 'away' && !awayWasFavored)
    },
    {
      name: 'Home Win %',
      winner: correctPick === 'home' ? homeMetrics.homeWinPct : awayMetrics.awayWinPct,
      loser: correctPick === 'home' ? awayMetrics.awayWinPct : homeMetrics.homeWinPct,
      higherIsBetter: true,
      category: 'location'
    },
    {
      name: 'Avg Points Scored',
      winner: winnerMetrics.avgPointsScored,
      loser: loserMetrics.avgPointsScored,
      higherIsBetter: true,
      category: 'offense'
    },
    {
      name: 'Avg Points Allowed',
      winner: winnerMetrics.avgPointsAllowed,
      loser: loserMetrics.avgPointsAllowed,
      higherIsBetter: false,
      category: 'defense'
    },
    {
      name: 'Point Differential',
      winner: winnerMetrics.pointDifferential,
      loser: loserMetrics.pointDifferential,
      higherIsBetter: true,
      category: 'overall'
    },
    {
      name: 'Avg Cover Margin',
      winner: winnerMetrics.avgCoverMargin,
      loser: loserMetrics.avgCoverMargin,
      higherIsBetter: true,
      category: 'spread'
    },
    {
      name: 'Recent Form (Pts)',
      winner: winnerMetrics.recentForm.avgPoints,
      loser: loserMetrics.recentForm.avgPoints,
      higherIsBetter: true,
      category: 'recent'
    },
    {
      name: 'Recent Form (ATS)',
      winner: winnerMetrics.recentForm.spreadWins,
      loser: loserMetrics.recentForm.spreadWins,
      higherIsBetter: true,
      category: 'recent'
    }
  ];

  metrics.forEach(metric => {
    // Skip contextual metrics that don't apply
    if (metric.contextual && !metric.applies) {
      return;
    }

    const diff = metric.winner - metric.loser;
    const predictedCorrectly = metric.higherIsBetter ? diff > 0 : diff < 0;
    const strength = Math.abs(diff);

    metricCorrelations.push({
      metric: metric.name,
      category: metric.category,
      winnerValue: metric.winner,
      loserValue: metric.loser,
      difference: diff,
      predictedCorrectly,
      strength,
      // Normalized strength score (0-100)
      importanceScore: calculateImportanceScore(metric.name, strength, predictedCorrectly)
    });
  });

  // Sort by importance score
  metricCorrelations.sort((a, b) => b.importanceScore - a.importanceScore);

  return {
    isPush: false,
    correctPick,
    winnerTeam: {
      id: winnerTeam.id,
      name: winnerTeam.name,
      abbreviation: winnerTeam.abbreviation,
      score: winnerTeam.score
    },
    loserTeam: {
      id: loserTeam.id,
      name: loserTeam.name,
      abbreviation: loserTeam.abbreviation,
      score: loserTeam.score
    },
    spread: spread.value,
    actualMargin,
    coverMargin: correctPick === 'home' ? homeCoverMargin : awayCoverMargin,
    metricCorrelations,
    // Summary stats
    metricsSupporting: metricCorrelations.filter(m => m.predictedCorrectly).length,
    metricsAgainst: metricCorrelations.filter(m => !m.predictedCorrectly).length,
    avgImportanceScore: metricCorrelations.reduce((sum, m) => sum + m.importanceScore, 0) / metricCorrelations.length
  };
}

/**
 * Calculate importance score for a metric
 * This weighs both the strength of the difference and whether it predicted correctly
 */
function calculateImportanceScore(metricName, strength, predictedCorrectly) {
  // Base score from strength
  let score = 0;

  // Different scaling for different metrics
  if (metricName.includes('Win %')) {
    score = Math.min(strength * 2, 100); // Percentage differences
  } else if (metricName.includes('Points')) {
    score = Math.min(strength * 5, 100); // Points differences
  } else if (metricName.includes('Cover Margin')) {
    score = Math.min(Math.abs(strength) * 3, 100);
  } else if (metricName.includes('Recent Form')) {
    score = Math.min(strength * 10, 100);
  } else {
    score = Math.min(strength * 2, 100);
  }

  // Boost if predicted correctly
  if (predictedCorrectly) {
    score *= 1.5;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Backtest a specific game
 */
function backtestGame(week, gameId, allGameResults) {
  const weekGames = allGameResults[week.toString()];
  if (!weekGames || !weekGames[gameId]) {
    return { error: 'Game not found' };
  }

  const game = weekGames[gameId];

  // Calculate team metrics up to this week
  const homeMetrics = calculateTeamMetricsAtWeek(game.homeTeam.id, week, allGameResults);
  const awayMetrics = calculateTeamMetricsAtWeek(game.awayTeam.id, week, allGameResults);

  if (!homeMetrics || !awayMetrics) {
    return {
      error: 'Insufficient historical data for one or both teams',
      week,
      gameId
    };
  }

  // Analyze the game
  const analysis = analyzeCompletedGame(game, homeMetrics, awayMetrics);

  return {
    week,
    gameId,
    game: {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      spread: game.spread,
      date: game.date
    },
    homeMetrics,
    awayMetrics,
    analysis
  };
}

/**
 * Backtest multiple weeks and aggregate insights
 */
function backtestWeekRange(startWeek, endWeek, allGameResults) {
  const results = [];
  const metricPerformance = {};

  for (let week = startWeek; week <= endWeek; week++) {
    const weekGames = allGameResults[week.toString()];
    if (!weekGames) continue;

    for (const gameId in weekGames) {
      const backtestResult = backtestGame(week, gameId, allGameResults);

      if (!backtestResult.error && !backtestResult.analysis.isPush) {
        results.push(backtestResult);

        // Aggregate metric performance
        backtestResult.analysis.metricCorrelations.forEach(mc => {
          if (!metricPerformance[mc.metric]) {
            metricPerformance[mc.metric] = {
              metric: mc.metric,
              category: mc.category,
              timesCorrect: 0,
              timesWrong: 0,
              totalImportance: 0,
              avgImportance: 0
            };
          }

          if (mc.predictedCorrectly) {
            metricPerformance[mc.metric].timesCorrect++;
          } else {
            metricPerformance[mc.metric].timesWrong++;
          }
          metricPerformance[mc.metric].totalImportance += mc.importanceScore;
        });
      }
    }
  }

  // Calculate metric accuracy
  const metricRankings = Object.values(metricPerformance).map(mp => {
    const total = mp.timesCorrect + mp.timesWrong;
    return {
      ...mp,
      accuracy: total > 0 ? (mp.timesCorrect / total) * 100 : 0,
      avgImportance: total > 0 ? mp.totalImportance / total : 0,
      totalGames: total
    };
  });

  // Sort by accuracy then importance
  metricRankings.sort((a, b) => {
    if (Math.abs(a.accuracy - b.accuracy) > 5) {
      return b.accuracy - a.accuracy;
    }
    return b.avgImportance - a.avgImportance;
  });

  return {
    gamesAnalyzed: results.length,
    weekRange: { start: startWeek, end: endWeek },
    metricRankings,
    results
  };
}

module.exports = {
  backtestGame,
  backtestWeekRange,
  calculateTeamMetricsAtWeek,
  analyzeCompletedGame
};
