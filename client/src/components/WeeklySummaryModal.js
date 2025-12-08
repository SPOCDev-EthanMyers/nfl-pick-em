import React, { useState, useEffect } from 'react';
import './WeeklySummaryModal.css';

function WeeklySummaryModal({ week, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('games'); // 'games' or 'metrics'

  useEffect(() => {
    fetchWeeklySummary();
  }, [week]);

  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/api/summary/week/${week}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch summary`);
      }

      const data = await response.json();
      console.log('Weekly summary:', data);
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = (gameId) => {
    onClose();
    setTimeout(() => {
      const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
      if (gameElement) {
        gameElement.click();
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="summary-modal-overlay" onClick={onClose}>
        <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Analyzing week {week}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="summary-modal-overlay" onClick={onClose}>
        <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
          <div className="error-container">
            <h3>Error</h3>
            <p>{error || 'No data'}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-modal-overlay" onClick={onClose}>
      <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="summary-header">
          <h2>Week {week} Analysis</h2>
          <div className="view-toggle">
            <button
              className={view === 'games' ? 'active' : ''}
              onClick={() => setView('games')}
            >
              By Game
            </button>
            <button
              className={view === 'metrics' ? 'active' : ''}
              onClick={() => setView('metrics')}
            >
              By Metric
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="summary-content">
          {view === 'games' ? (
            <GameView summary={summary} onGameClick={handleGameClick} />
          ) : (
            <MetricView summary={summary} onGameClick={handleGameClick} />
          )}
        </div>
      </div>
    </div>
  );
}

// GAME VIEW: Show which games had strong/weak metric support
function GameView({ summary, onGameClick }) {
  // Combine all games and sort by metric strength
  const allGames = [
    ...summary.upcoming.highConfidence.games.map(g => ({ ...g, type: 'upcoming', strength: g.analysis.confidenceScore })),
    ...summary.upcoming.mediumConfidence.games.map(g => ({ ...g, type: 'upcoming', strength: g.analysis.confidenceScore })),
    ...summary.upcoming.lowConfidence.games.map(g => ({ ...g, type: 'upcoming', strength: g.analysis.confidenceScore })),
    ...summary.completed.easyPicks.games.map(g => ({ ...g, type: 'completed', strength: g.avgImportance })),
    ...summary.completed.upsets.games.map(g => ({ ...g, type: 'completed', strength: g.avgImportance })),
    ...summary.completed.tossUps.games.map(g => ({ ...g, type: 'completed', strength: g.avgImportance }))
  ].sort((a, b) => b.strength - a.strength);

  if (allGames.length === 0) {
    return <div className="empty">No games available</div>;
  }

  return (
    <div className="game-view">
      <div className="section-header">
        <h3>Games Ranked by Data Strength</h3>
        <p>Higher = more metrics agree on the outcome/pick</p>
      </div>

      <div className="games-grid">
        {allGames.map((gameData, idx) => (
          <GameCard
            key={idx}
            gameData={gameData}
            rank={idx + 1}
            onGameClick={onGameClick}
          />
        ))}
      </div>
    </div>
  );
}

// METRIC VIEW: Show which metrics performed best/worst
function MetricView({ summary, onGameClick }) {
  // Aggregate metric performance across all completed games
  const metricPerformance = {};

  summary.completed.easyPicks.games.forEach(g => aggregateMetrics(g, metricPerformance));
  summary.completed.upsets.games.forEach(g => aggregateMetrics(g, metricPerformance));
  summary.completed.tossUps.games.forEach(g => aggregateMetrics(g, metricPerformance));

  const metrics = Object.values(metricPerformance).map(m => ({
    ...m,
    accuracy: m.total > 0 ? (m.correct / m.total) * 100 : 0,
    avgImportance: m.total > 0 ? m.totalImportance / m.total : 0
  })).sort((a, b) => b.accuracy - a.accuracy);

  if (metrics.length === 0) {
    return <div className="empty">No completed games to analyze metrics</div>;
  }

  return (
    <div className="metric-view">
      <div className="section-header">
        <h3>Metrics Ranked by Accuracy</h3>
        <p>Shows which stats best predicted winners this week</p>
      </div>

      <div className="metrics-list">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} metric={metric} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function aggregateMetrics(gameData, metricPerformance) {
  if (!gameData.backtestResult?.analysis?.metricCorrelations) return;

  gameData.backtestResult.analysis.metricCorrelations.forEach(mc => {
    if (!metricPerformance[mc.metric]) {
      metricPerformance[mc.metric] = {
        metric: mc.metric,
        category: mc.category,
        correct: 0,
        wrong: 0,
        total: 0,
        totalImportance: 0,
        games: []
      };
    }

    const perf = metricPerformance[mc.metric];
    if (mc.predictedCorrectly) {
      perf.correct++;
    } else {
      perf.wrong++;
    }
    perf.total++;
    perf.totalImportance += mc.importanceScore;
    perf.games.push({
      gameId: gameData.gameId,
      winner: gameData.winner?.abbreviation,
      loser: gameData.loser?.abbreviation
    });
  });
}

function GameCard({ gameData, rank, onGameClick }) {
  const { type, game, analysis, winner, loser, metricsSupporting, strength } = gameData;
  const isUpcoming = type === 'upcoming';
  console.log("Game card data", gameData);

  return (
    <div
      className={`game-card ${isUpcoming ? 'upcoming' : 'completed'}`}
      onClick={() => onGameClick(gameData.gameId || game?.id)}
    >
      <div className="rank">#{rank}</div>

      <div className="matchup">
        {isUpcoming ? (
          <>
            <div className="teams">
              {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
            </div>
            <div className="spread-line">
              {analysis.favoredTeam.abbreviation} -{analysis.spread}
            </div>
          </>
        ) : (
          <>
            <div className="teams winner">{winner?.abbreviation} {game.homeTeam.id === winner?.id ? game.homeTeam.score : game.awayTeam.score}</div>
            <div className="teams loser">{loser?.abbreviation} {game.homeTeam.id === loser?.id ? game.homeTeam.score : game.awayTeam.score}</div>
          </>
        )}
      </div>

      <div className="strength-bar">
        <div className="bar-fill" style={{ width: `${strength}%` }}></div>
        <span className="strength-value">{Math.round(strength)}</span>
      </div>

      <div className="card-footer">
        {isUpcoming ? (
          <span>{analysis.metricsSupporting}/{analysis.metricsSupporting + analysis.metricsAgainst} metrics</span>
        ) : (
          <span>{metricsSupporting} metrics supported</span>
        )}
      </div>
    </div>
  );
}

function MetricCard({ metric, rank }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="rank">#{rank}</span>
        <span className="metric-name">{metric.metric}</span>
        <span className={`category-tag ${metric.category}`}>{metric.category}</span>
      </div>

      <div className="metric-stats">
        <div className="stat">
          <div className="stat-label">Accuracy</div>
          <div className="stat-value">{Math.round(metric.accuracy)}%</div>
        </div>
        <div className="stat">
          <div className="stat-label">Correct</div>
          <div className="stat-value">{metric.correct}/{metric.total}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg Importance</div>
          <div className="stat-value">{Math.round(metric.avgImportance)}</div>
        </div>
      </div>

      <div className="accuracy-bar">
        <div
          className="bar-fill"
          style={{
            width: `${metric.accuracy}%`,
            background: metric.accuracy >= 70 ? '#2ecc71' : metric.accuracy >= 50 ? '#f39c12' : '#e74c3c'
          }}
        ></div>
      </div>

      <div className="games-list-compact">
        {metric.games.slice(0, 3).map((g, i) => (
          <span key={i} className="game-tag">{g.winner} vs {g.loser}</span>
        ))}
        {metric.games.length > 3 && <span className="more">+{metric.games.length - 3} more</span>}
      </div>
    </div>
  );
}

export default WeeklySummaryModal;
