const { backtestGame } = require('./backtest-analytics');
const { calculateTeamAnalytics } = require('./preprocess-analytics');

/**
 * Analyze a single upcoming game to determine confidence level
 */
function analyzeUpcomingGame(game, homeMetrics, awayMetrics) {
  const { homeTeam, awayTeam, spread } = game;

  if (!spread || !homeMetrics || !awayMetrics) {
    return {
      gameId: game.id,
      confidence: 'low',
      confidenceScore: 0,
      metricsAlignment: 0,
      suggestedPick: null
    };
  }

  const homeWasFavored = spread.favoredTeam === homeTeam.id;
  const awayWasFavored = spread.favoredTeam === awayTeam.id;

  // Compare metrics to see if they support the favorite
  const metrics = [
    {
      name: 'Spread Win %',
      favoredValue: homeWasFavored ? homeMetrics.spreadWinPct : awayMetrics.spreadWinPct,
      underdogValue: homeWasFavored ? awayMetrics.spreadWinPct : homeMetrics.spreadWinPct,
      higherIsBetter: true,
      weight: 2.0 // High weight for ATS performance
    },
    {
      name: 'Favorite Win %',
      favoredValue: homeWasFavored ? homeMetrics.favoriteWinPct : awayMetrics.favoriteWinPct,
      underdogValue: homeWasFavored ? awayMetrics.underdogWinPct : homeMetrics.underdogWinPct,
      higherIsBetter: true,
      weight: 1.5
    },
    {
      name: 'Home/Away Win %',
      favoredValue: homeWasFavored ? homeMetrics.homeWinPct : awayMetrics.awayWinPct,
      underdogValue: homeWasFavored ? awayMetrics.awayWinPct : homeMetrics.homeWinPct,
      higherIsBetter: true,
      weight: 1.2
    },
    {
      name: 'Avg Points Scored',
      favoredValue: homeWasFavored ? homeMetrics.avgPointsScored : awayMetrics.avgPointsScored,
      underdogValue: homeWasFavored ? awayMetrics.avgPointsScored : homeMetrics.avgPointsScored,
      higherIsBetter: true,
      weight: 1.0
    },
    {
      name: 'Avg Points Allowed',
      favoredValue: homeWasFavored ? homeMetrics.avgPointsAllowed : awayMetrics.avgPointsAllowed,
      underdogValue: homeWasFavored ? awayMetrics.avgPointsAllowed : homeMetrics.avgPointsAllowed,
      higherIsBetter: false,
      weight: 1.0
    },
    {
      name: 'Point Differential',
      favoredValue: homeWasFavored ? homeMetrics.pointDifferential : awayMetrics.pointDifferential,
      underdogValue: homeWasFavored ? awayMetrics.pointDifferential : homeMetrics.pointDifferential,
      higherIsBetter: true,
      weight: 1.3
    },
    {
      name: 'Recent Form',
      favoredValue: homeWasFavored ? homeMetrics.recentForm?.spreadWins : awayMetrics.recentForm?.spreadWins || '0',
      underdogValue: homeWasFavored ? awayMetrics.recentForm?.spreadWins : homeMetrics.recentForm?.spreadWins || '0',
      higherIsBetter: true,
      weight: 1.1
    }
  ];

  let metricsSupporting = 0;
  let metricsAgainst = 0;
  let totalWeight = 0;
  let weightedSupport = 0;

  metrics.forEach(metric => {
    const diff = metric.favoredValue - metric.underdogValue;
    const supportsFavorite = metric.higherIsBetter ? diff > 0 : diff < 0;

    totalWeight += metric.weight;
    if (supportsFavorite) {
      metricsSupporting++;
      weightedSupport += metric.weight;
    } else {
      metricsAgainst++;
    }
  });

  const metricsAlignment = (metricsSupporting / metrics.length) * 100;
  const weightedConfidence = (weightedSupport / totalWeight) * 100;

  // Determine confidence level
  let confidence;
  if (weightedConfidence >= 70) {
    confidence = 'high';
  } else if (weightedConfidence >= 50) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Determine suggested pick
  const favoredTeam = homeWasFavored ? homeTeam : awayTeam;
  const underdogTeam = homeWasFavored ? awayTeam : homeTeam;

  let suggestedPick;
  if (weightedConfidence >= 60) {
    suggestedPick = {
      team: favoredTeam,
      reason: 'Metrics strongly support the favorite'
    };
  } else if (weightedConfidence <= 40) {
    suggestedPick = {
      team: underdogTeam,
      reason: 'Metrics favor the underdog'
    };
  } else {
    suggestedPick = {
      team: null,
      reason: 'Mixed signals - proceed with caution'
    };
  }

  return {
    gameId: game.id,
    confidence,
    confidenceScore: Math.round(weightedConfidence),
    metricsAlignment: Math.round(metricsAlignment),
    metricsSupporting,
    metricsAgainst,
    suggestedPick,
    favoredTeam: {
      id: favoredTeam.id,
      abbreviation: favoredTeam.abbreviation,
      name: favoredTeam.name
    },
    underdogTeam: {
      id: underdogTeam.id,
      abbreviation: underdogTeam.abbreviation,
      name: underdogTeam.name
    },
    spread: spread.value
  };
}

/**
 * Categorize a completed game based on backtest results
 */
function categorizeCompletedGame(backtestResult) {
  if (!backtestResult || backtestResult.error || backtestResult.analysis.isPush) {
    return {
      category: 'inconclusive',
      categoryLabel: 'Inconclusive',
      reason: 'Push or insufficient data'
    };
  }

  const { analysis } = backtestResult;
  const supportPercentage = (analysis.metricsSupporting / (analysis.metricsSupporting + analysis.metricsAgainst)) * 100;
  const avgImportance = analysis.avgImportanceScore;

  // "Easy Pick" - metrics strongly supported the winner
  if (supportPercentage >= 70 && avgImportance >= 50) {
    return {
      category: 'easy',
      categoryLabel: 'Easy Pick',
      reason: `${analysis.metricsSupporting}/${analysis.metricsSupporting + analysis.metricsAgainst} metrics supported the winner with high importance`,
      icon: '✓',
      color: '#2ecc71'
    };
  }

  // "Upset" - metrics didn't support the winner
  if (supportPercentage <= 40) {
    return {
      category: 'upset',
      categoryLabel: 'Nobody Saw That Coming',
      reason: `Only ${analysis.metricsSupporting}/${analysis.metricsSupporting + analysis.metricsAgainst} metrics supported the winner`,
      icon: '⚡',
      color: '#e74c3c'
    };
  }

  // "Toss-Up" - mixed signals
  return {
    category: 'tossup',
    categoryLabel: 'Toss-Up',
    reason: `Mixed signals with ${Math.round(supportPercentage)}% metric support`,
    icon: '~',
    color: '#f39c12'
  };
}

/**
 * Generate a comprehensive weekly summary
 */
async function generateWeeklySummary(week, allGameResults, teamAnalytics, spreads, currentWeekGames = {}) {
  const weekGames = allGameResults[week.toString()] || {};
  const weekSpreads = spreads[week] || {};

  // Merge historical and current week games
  const allWeekGames = { ...weekGames, ...currentWeekGames };

  const completedGames = [];
  const upcomingGames = [];

  // Process each game
  for (const [gameId, game] of Object.entries(allWeekGames)) {
    const isComplete = game.status !== 'pre';

    if (isComplete) {
      // Backtest completed game
      const backtestResult = backtestGame(week, gameId, allGameResults);
      const category = categorizeCompletedGame(backtestResult);

      completedGames.push({
        gameId,
        game,
        backtestResult,
        category,
        winner: backtestResult?.analysis?.winnerTeam,
        loser: backtestResult?.analysis?.loserTeam,
        metricsSupporting: backtestResult?.analysis?.metricsSupporting || 0,
        avgImportance: backtestResult?.analysis?.avgImportanceScore || 0
      });
    } else {
      // Analyze upcoming game
      const homeMetrics = teamAnalytics[game.homeTeam.id];
      const awayMetrics = teamAnalytics[game.awayTeam.id];

      if (homeMetrics && awayMetrics) {
        const gameWithSpread = {
          ...game,
          id: gameId,
          spread: weekSpreads[gameId]
        };

        const analysis = analyzeUpcomingGame(
          gameWithSpread,
          homeMetrics.analytics,
          awayMetrics.analytics
        );

        upcomingGames.push({
          gameId,
          game,
          analysis,
          confidence: analysis.confidence,
          confidenceScore: analysis.confidenceScore
        });
      }
    }
  }

  // Sort completed games by category
  const easyPicks = completedGames.filter(g => g.category.category === 'easy');
  const upsets = completedGames.filter(g => g.category.category === 'upset');
  const tossUps = completedGames.filter(g => g.category.category === 'tossup');

  // Sort upcoming games by confidence
  const highConfidence = upcomingGames.filter(g => g.confidence === 'high');
  const mediumConfidence = upcomingGames.filter(g => g.confidence === 'medium');
  const lowConfidence = upcomingGames.filter(g => g.confidence === 'low');

  return {
    week,
    totalGames: completedGames.length + upcomingGames.length,
    completed: {
      total: completedGames.length,
      easyPicks: {
        count: easyPicks.length,
        games: easyPicks.sort((a, b) => b.avgImportance - a.avgImportance)
      },
      upsets: {
        count: upsets.length,
        games: upsets.sort((a, b) => a.metricsSupporting - b.metricsSupporting)
      },
      tossUps: {
        count: tossUps.length,
        games: tossUps
      }
    },
    upcoming: {
      total: upcomingGames.length,
      highConfidence: {
        count: highConfidence.length,
        games: highConfidence.sort((a, b) => b.confidenceScore - a.confidenceScore)
      },
      mediumConfidence: {
        count: mediumConfidence.length,
        games: mediumConfidence.sort((a, b) => b.confidenceScore - a.confidenceScore)
      },
      lowConfidence: {
        count: lowConfidence.length,
        games: lowConfidence.sort((a, b) => b.confidenceScore - a.confidenceScore)
      }
    }
  };
}

module.exports = {
  generateWeeklySummary,
  analyzeUpcomingGame,
  categorizeCompletedGame
};
