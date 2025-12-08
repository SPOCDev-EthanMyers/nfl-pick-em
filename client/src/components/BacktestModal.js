import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import './BacktestModal.css';

function BacktestModal({ game, week, onClose }) {
  const [backtestData, setBacktestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBacktestData();
  }, [game.id, week]);

  const fetchBacktestData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5001/api/backtest/game/${week}/${game.id}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch backtest data`);
      }

      const data = await response.json();
      console.log('Backtest data:', data);
      setBacktestData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching backtest data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="backtest-modal-overlay" onClick={onClose}>
        <div className="backtest-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Analyzing historical data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !backtestData) {
    return (
      <div className="backtest-modal-overlay" onClick={onClose}>
        <div className="backtest-modal" onClick={(e) => e.stopPropagation()}>
          <div className="error-container">
            <h3>Error Loading Backtest</h3>
            <p>{error || 'No data available'}</p>
            <button onClick={onClose} className="btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (backtestData.error) {
    return (
      <div className="backtest-modal-overlay" onClick={onClose}>
        <div className="backtest-modal" onClick={(e) => e.stopPropagation()}>
          <div className="error-container">
            <h3>Backtest Not Available</h3>
            <p>{backtestData.error}</p>
            <p className="hint">This game may not have enough historical data for backtesting.</p>
            <button onClick={onClose} className="btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  const { game: gameData, homeMetrics, awayMetrics, analysis } = backtestData;

  return (
    <div className="backtest-modal-overlay" onClick={onClose}>
      <div className="backtest-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <BacktestHeader
          game={gameData}
          week={week}
          analysis={analysis}
          onClose={onClose}
        />

        {/* Main Content */}
        <div className="backtest-content">
          {/* Game Result Summary */}
          <GameResultSummary game={gameData} analysis={analysis} />

          {/* Metric Correlations */}
          <MetricCorrelations analysis={analysis} />

          {/* Team Metrics Comparison */}
          <TeamMetricsComparison
            homeTeam={gameData.homeTeam}
            awayTeam={gameData.awayTeam}
            homeMetrics={homeMetrics}
            awayMetrics={awayMetrics}
            analysis={analysis}
          />

          {/* Metric Performance Chart */}
          <MetricPerformanceChart analysis={analysis} />
        </div>
      </div>
    </div>
  );
}

// Header Component
function BacktestHeader({ game, week, analysis, onClose }) {
  return (
    <div className="backtest-header">
      <div className="header-content">
        <h2>BACKTEST ANALYSIS - WEEK {week}</h2>
        <div className="matchup-display">
          <span className="team-name">{game.awayTeam.abbreviation}</span>
          <span className="score">{game.awayTeam.score}</span>
          <span className="vs-symbol">@</span>
          <span className="team-name">{game.homeTeam.abbreviation}</span>
          <span className="score">{game.homeTeam.score}</span>
        </div>
        {!analysis.isPush && (
          <div className="correct-pick-banner">
            Correct Pick: <strong>{analysis.winnerTeam.abbreviation}</strong>
          </div>
        )}
      </div>
      <button className="backtest-close-btn" onClick={onClose}>×</button>
    </div>
  );
}

// Game Result Summary
function GameResultSummary({ game, analysis }) {
  if (analysis.isPush) {
    return (
      <div className="result-summary push">
        <h3>Game Result: PUSH</h3>
        <p>This game ended in a push against the spread of {game.spread.value}</p>
        <p>Actual margin: {analysis.actualMargin}</p>
      </div>
    );
  }

  const favTeam = game.spread.favoredTeam === game.homeTeam.id
    ? game.homeTeam
    : game.awayTeam;

  return (
    <div className="result-summary">
      <div className="summary-grid">
        <div className="summary-item">
          <label>Spread</label>
          <div className="value">{favTeam.abbreviation} -{game.spread.value}</div>
        </div>
        <div className="summary-item">
          <label>Actual Margin</label>
          <div className="value">{analysis.actualMargin > 0 ? `${game.homeTeam.abbreviation} by ${analysis.actualMargin}` : `${game.awayTeam.abbreviation} by ${Math.abs(analysis.actualMargin)}`}</div>
        </div>
        <div className="summary-item">
          <label>Cover Margin</label>
          <div className={`value ${analysis.coverMargin > 0 ? 'positive' : 'negative'}`}>
            {analysis.coverMargin > 0 ? '+' : ''}{analysis.coverMargin.toFixed(1)}
          </div>
        </div>
        <div className="summary-item">
          <label>Winner</label>
          <div className="value winner">{analysis.winnerTeam.abbreviation}</div>
        </div>
      </div>

      <div className="metrics-summary">
        <div className="metric-stat supporting">
          <span className="count">{analysis.metricsSupporting}</span>
          <span className="label">Metrics Supporting</span>
        </div>
        <div className="metric-stat against">
          <span className="count">{analysis.metricsAgainst}</span>
          <span className="label">Metrics Against</span>
        </div>
        <div className="metric-stat avg">
          <span className="count">{analysis.avgImportanceScore.toFixed(0)}</span>
          <span className="label">Avg Importance</span>
        </div>
      </div>
    </div>
  );
}

// Metric Correlations Table
function MetricCorrelations({ analysis }) {
  if (analysis.isPush) return null;

  return (
    <div className="metric-correlations">
      <h3>Metric Analysis</h3>
      <div className="importance-score-explainer">
        <div className="explainer-header">
          <strong>Understanding Importance Score (0-100)</strong>
        </div>
        <div className="explainer-content">
          <div className="score-breakdown">
            <div className="score-factor">
              <span className="factor-icon">📊</span>
              <div className="factor-text">
                <strong>Difference Strength</strong>
                <p>How much better one team's metric was vs the other</p>
              </div>
            </div>
            <div className="score-factor">
              <span className="factor-icon">✓</span>
              <div className="factor-text">
                <strong>Prediction Accuracy</strong>
                <p>Metrics that predicted correctly get a 1.5x boost</p>
              </div>
            </div>
          </div>
          <div className="score-guide">
            <div className="guide-item high">
              <span className="guide-bar" style={{width: '80%'}}></span>
              <span className="guide-label">70-100: Strong indicator - Large advantage that predicted correctly</span>
            </div>
            <div className="guide-item medium">
              <span className="guide-bar" style={{width: '50%'}}></span>
              <span className="guide-label">40-69: Moderate signal - Noticeable difference</span>
            </div>
            <div className="guide-item low">
              <span className="guide-bar" style={{width: '25%'}}></span>
              <span className="guide-label">0-39: Weak signal - Small difference or predicted incorrectly</span>
            </div>
          </div>
        </div>
      </div>
      <p className="description">
        Green rows = metric correctly predicted the winner. Higher importance scores = more reliable indicators.
      </p>
      <div className="table-wrapper">
        <table className="correlations-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Category</th>
              <th>Winner Value</th>
              <th>Loser Value</th>
              <th>Difference</th>
              <th>Predicted</th>
              <th>Importance</th>
            </tr>
          </thead>
          <tbody>
            {analysis.metricCorrelations.map((mc, idx) => (
              <tr key={idx} className={mc.predictedCorrectly ? 'correct' : 'incorrect'}>
                <td className="metric-name">{mc.metric}</td>
                <td className="category">
                  <span className={`category-badge ${mc.category}`}>{mc.category}</span>
                </td>
                <td className="metric-value">{mc.winnerValue.toFixed(1)}</td>
                <td className="metric-value">{mc.loserValue.toFixed(1)}</td>
                <td className={`difference ${mc.difference > 0 ? 'positive' : 'negative'}`}>
                  {mc.difference > 0 ? '+' : ''}{mc.difference.toFixed(1)}
                </td>
                <td className="predicted">
                  {mc.predictedCorrectly ? '✓' : '✗'}
                </td>
                <td className="importance">
                  <div className="importance-bar">
                    <div
                      className="importance-fill"
                      style={{ width: `${mc.importanceScore}%` }}
                    />
                    <span className="importance-text">{mc.importanceScore}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Team Metrics Comparison
function TeamMetricsComparison({ homeTeam, awayTeam, homeMetrics, awayMetrics, analysis }) {
  const metrics = [
    { label: 'Spread Win %', home: homeMetrics.spreadWinPct, away: awayMetrics.spreadWinPct },
    { label: 'Home/Away Win %', home: homeMetrics.homeWinPct, away: awayMetrics.awayWinPct },
    { label: 'Avg Points Scored', home: homeMetrics.avgPointsScored, away: awayMetrics.avgPointsScored },
    { label: 'Avg Points Allowed', home: homeMetrics.avgPointsAllowed, away: awayMetrics.avgPointsAllowed },
    { label: 'Point Differential', home: homeMetrics.pointDifferential, away: awayMetrics.pointDifferential },
    { label: 'Recent Form (Pts)', home: homeMetrics.recentForm.avgPoints, away: awayMetrics.recentForm.avgPoints },
  ];

  const winnerIsHome = !analysis.isPush && analysis.correctPick === 'home';

  return (
    <div className="team-metrics-comparison">
      <h3>Pre-Game Team Metrics</h3>
      <p className="description">Team statistics leading up to this game (historical data only)</p>
      <div className="comparison-grid">
        <div className="team-header away">{awayTeam.abbreviation}</div>
        <div className="metric-header">Metric</div>
        <div className="team-header home">{homeTeam.abbreviation}</div>

        {metrics.map((metric, idx) => (
          <React.Fragment key={idx}>
            <div className={`metric-cell away ${!analysis.isPush && !winnerIsHome && metric.away > metric.home ? 'better' : ''}`}>
              {metric.away.toFixed(1)}
            </div>
            <div className="metric-label">{metric.label}</div>
            <div className={`metric-cell home ${!analysis.isPush && winnerIsHome && metric.home > metric.away ? 'better' : ''}`}>
              {metric.home.toFixed(1)}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Metric Performance Chart
function MetricPerformanceChart({ analysis }) {
  if (analysis.isPush) return null;

  // Prepare data for chart - top 8 metrics by importance
  const topMetrics = analysis.metricCorrelations.slice(0, 8);

  const chartData = topMetrics.map(mc => ({
    metric: mc.metric.replace(/ /g, '\n'),
    importance: mc.importanceScore,
    correct: mc.predictedCorrectly ? mc.importanceScore : 0,
    incorrect: !mc.predictedCorrectly ? mc.importanceScore : 0
  }));

  return (
    <div className="metric-performance-chart">
      <h3>Top Predictive Metrics</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#2c3e50" />
          <XAxis type="number" stroke="#ecf0f1" domain={[0, 100]} />
          <YAxis type="category" dataKey="metric" stroke="#ecf0f1" width={120} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2ecc71' }}
            formatter={(value) => value.toFixed(0)}
          />
          <Legend />
          <Bar dataKey="correct" stackId="a" fill="#2ecc71" name="Predicted Correctly" />
          <Bar dataKey="incorrect" stackId="a" fill="#e74c3c" name="Predicted Incorrectly" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BacktestModal;
