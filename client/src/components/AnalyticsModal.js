import React, { useState, useEffect } from 'react';
import './AnalyticsModal.css';

function AnalyticsModal({ game, week, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startWeek, setStartWeek] = useState(1);
  const [endWeek, setEndWeek] = useState(week - 1);

  useEffect(() => {
    fetchAnalytics();
  }, [game.id, week, startWeek, endWeek]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        week,
        startWeek,
        endWeek,
        homeTeamId: game.homeTeam.id,
        awayTeamId: game.awayTeam.id,
        homeTeamName: game.homeTeam.name,
        awayTeamName: game.awayTeam.name,
        homeTeamAbbr: game.homeTeam.abbreviation,
        awayTeamAbbr: game.awayTeam.abbreviation
      });

      const response = await fetch(
        `http://localhost:5001/api/analytics/game/${game.id}?${queryParams}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekRangeChange = () => {
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="analytics-modal-overlay" onClick={onClose}>
        <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
          <div className="analytics-loading">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-modal-overlay" onClick={onClose}>
        <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
          <div className="analytics-error">
            <h3>Error Loading Analytics</h3>
            <p>{error}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const { homeTeam, awayTeam, currentSpread, currentWeek, analysisRange } = analytics;

  return (
    <div className="analytics-modal-overlay" onClick={onClose}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <h2>Game Analytics - Week {currentWeek}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="matchup-header">
          <div className="team-matchup">
            <span className="team-name">{awayTeam.abbreviation}</span>
            <span className="at-symbol">@</span>
            <span className="team-name">{homeTeam.abbreviation}</span>
          </div>
          {currentSpread && (
            <div className="current-spread">
              Spread: {currentSpread.favoredTeam === homeTeam.id ? homeTeam.abbreviation : awayTeam.abbreviation} -{currentSpread.value}
            </div>
          )}
        </div>

        <div className="week-range-selector">
          <label>
            Analysis Range:
            <input
              type="number"
              min="1"
              max={currentWeek - 1}
              value={startWeek}
              onChange={(e) => setStartWeek(parseInt(e.target.value))}
            />
            to
            <input
              type="number"
              min={startWeek}
              max={currentWeek - 1}
              value={endWeek}
              onChange={(e) => setEndWeek(parseInt(e.target.value))}
            />
            <button onClick={handleWeekRangeChange}>Update</button>
          </label>
          <span className="range-info">
            (Weeks {analysisRange.startWeek}-{analysisRange.endWeek})
          </span>
        </div>

        <div className="analytics-content">
          <div className="team-analytics">
            <TeamAnalytics team={awayTeam} label="Away Team" />
          </div>

          <div className="team-analytics">
            <TeamAnalytics team={homeTeam} label="Home Team" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamAnalytics({ team, label }) {
  const { analytics } = team;

  if (!analytics || analytics.totalGames === 0) {
    return (
      <div className="no-data">
        <h3>{team.name} ({label})</h3>
        <p>No historical data available for this team in the selected range.</p>
      </div>
    );
  }

  return (
    <div className="team-section">
      <h3>{team.name} ({label})</h3>
      <p className="games-analyzed">Games Analyzed: {analytics.totalGames}</p>

      {/* Spread Records */}
      <div className="stats-section">
        <h4>Spread Performance</h4>
        <StatRecord label="Overall ATS" record={analytics.spreadRecord} />
        <StatRecord label="As Favorite" record={analytics.favoriteRecord} />
        <StatRecord label="As Underdog" record={analytics.underdogRecord} />
        <StatRecord label="At Home" record={analytics.homeRecord} />
        <StatRecord label="On Road" record={analytics.awayRecord} />
      </div>

      {/* Cover Statistics */}
      {analytics.coverStats.favorite.mean !== null && (
        <div className="stats-section">
          <h4>Cover Margins (As Favorite)</h4>
          <StatLine label="Mean Cover Margin" value={analytics.coverStats.favorite.mean} />
          <StatLine label="Median Cover Margin" value={analytics.coverStats.favorite.median} />
          {analytics.coverStats.favorite.maxCover && (
            <StatDetail
              label="Best Cover"
              value={analytics.coverStats.favorite.maxCover.value}
              week={analytics.coverStats.favorite.maxCover.week}
              opponent={analytics.coverStats.favorite.maxCover.opponent}
              spread={analytics.coverStats.favorite.maxCover.spread}
            />
          )}
          {analytics.coverStats.favorite.minCover && (
            <StatDetail
              label="Worst Cover"
              value={analytics.coverStats.favorite.minCover.value}
              week={analytics.coverStats.favorite.minCover.week}
              opponent={analytics.coverStats.favorite.minCover.opponent}
              spread={analytics.coverStats.favorite.minCover.spread}
            />
          )}
        </div>
      )}

      {analytics.coverStats.underdog.mean !== null && (
        <div className="stats-section">
          <h4>Cover Margins (As Underdog)</h4>
          <StatLine label="Mean Cover Margin" value={analytics.coverStats.underdog.mean} />
          <StatLine label="Median Cover Margin" value={analytics.coverStats.underdog.median} />
          {analytics.coverStats.underdog.maxCover && (
            <StatDetail
              label="Best Cover"
              value={analytics.coverStats.underdog.maxCover.value}
              week={analytics.coverStats.underdog.maxCover.week}
              opponent={analytics.coverStats.underdog.maxCover.opponent}
              spread={analytics.coverStats.underdog.maxCover.spread}
            />
          )}
          {analytics.coverStats.underdog.minCover && (
            <StatDetail
              label="Worst Cover"
              value={analytics.coverStats.underdog.minCover.value}
              week={analytics.coverStats.underdog.minCover.week}
              opponent={analytics.coverStats.underdog.minCover.opponent}
              spread={analytics.coverStats.underdog.minCover.spread}
            />
          )}
        </div>
      )}

      {/* Points Statistics */}
      <div className="stats-section">
        <h4>Points Scored</h4>
        <StatLine label="Mean" value={analytics.pointsStats.scored.mean} />
        <StatLine label="Median" value={analytics.pointsStats.scored.median} />
        {analytics.pointsStats.scored.max && (
          <StatDetail
            label="Max"
            value={analytics.pointsStats.scored.max.value}
            week={analytics.pointsStats.scored.max.week}
            opponent={analytics.pointsStats.scored.max.opponent}
            spread={analytics.pointsStats.scored.max.spread}
          />
        )}
        {analytics.pointsStats.scored.min && (
          <StatDetail
            label="Min"
            value={analytics.pointsStats.scored.min.value}
            week={analytics.pointsStats.scored.min.week}
            opponent={analytics.pointsStats.scored.min.opponent}
            spread={analytics.pointsStats.scored.min.spread}
          />
        )}
      </div>

      <div className="stats-section">
        <h4>Points Allowed</h4>
        <StatLine label="Mean" value={analytics.pointsStats.allowed.mean} />
        <StatLine label="Median" value={analytics.pointsStats.allowed.median} />
        {analytics.pointsStats.allowed.max && (
          <StatDetail
            label="Max"
            value={analytics.pointsStats.allowed.max.value}
            week={analytics.pointsStats.allowed.max.week}
            opponent={analytics.pointsStats.allowed.max.opponent}
            spread={analytics.pointsStats.allowed.max.spread}
          />
        )}
        {analytics.pointsStats.allowed.min && (
          <StatDetail
            label="Min"
            value={analytics.pointsStats.allowed.min.value}
            week={analytics.pointsStats.allowed.min.week}
            opponent={analytics.pointsStats.allowed.min.opponent}
            spread={analytics.pointsStats.allowed.min.spread}
          />
        )}
      </div>

      {/* Weekly Data Table */}
      <div className="stats-section">
        <h4>Week-by-Week Performance</h4>
        <div className="weekly-table-wrapper">
          <table className="weekly-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Opp</th>
                <th>H/A</th>
                <th>F/U</th>
                <th>Spread</th>
                <th>Scored</th>
                <th>Allowed</th>
                <th>Cover</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {analytics.weeklyData.map((weekData, idx) => (
                <tr key={idx} className={weekData.covered ? 'covered' : 'not-covered'}>
                  <td>{weekData.week}</td>
                  <td>{weekData.opponent}</td>
                  <td>{weekData.isHome ? 'H' : 'A'}</td>
                  <td>{weekData.isFavorite ? 'F' : 'U'}</td>
                  <td>{weekData.spread.toFixed(1)}</td>
                  <td>{weekData.pointsScored}</td>
                  <td>{weekData.pointsAllowed}</td>
                  <td>{weekData.covered ? '✓' : '✗'}</td>
                  <td className={weekData.coverMargin > 0 ? 'positive' : 'negative'}>
                    {weekData.coverMargin?.toFixed(1) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatRecord({ label, record }) {
  return (
    <div className="stat-record">
      <span className="stat-label">{label}:</span>
      <span className="stat-value">
        {record.wins}-{record.losses} ({record.percentage}%)
      </span>
    </div>
  );
}

function StatLine({ label, value }) {
  return (
    <div className="stat-line">
      <span className="stat-label">{label}:</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function StatDetail({ label, value, week, opponent, spread }) {
  return (
    <div className="stat-detail">
      <span className="stat-label">{label}:</span>
      <span className="stat-value">
        {value} (Week {week} vs {opponent}, Spread: {spread})
      </span>
    </div>
  );
}

export default AnalyticsModal;
