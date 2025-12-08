import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import './EnhancedAnalyticsModal.css';

function EnhancedAnalyticsModal({ game, week, onClose }) {
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
        awayTeamAbbr: game.awayTeam.abbreviation,
        homeTeamColor: game.homeTeam.color,
        awayTeamColor: game.awayTeam.color,
        homeTeamAlternateColor: game.homeTeam.alternateColor,
        awayTeamAlternateColor: game.awayTeam.alternateColor
      });

      const response = await fetch(
        `http://localhost:5001/api/analytics/game/${game.id}?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch analytics`);
      }

      const data = await response.json();
      console.log("Got game data", JSON.parse(JSON.stringify(data)));
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="enhanced-modal-overlay" onClick={onClose}>
        <div className="enhanced-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Crunching the numbers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enhanced-modal-overlay" onClick={onClose}>
        <div className="enhanced-modal" onClick={(e) => e.stopPropagation()}>
          <div className="error-container">
            <h3>⚠️ Error Loading Analytics</h3>
            <p>{error}</p>
            <button onClick={onClose} className="btn-primary">Close</button>
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
    <div className="enhanced-modal-overlay" onClick={onClose}>
      <div className="enhanced-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <ModalHeader
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          currentSpread={currentSpread}
          currentWeek={currentWeek}
          onClose={onClose}
        />

        {/* Main Content */}
        <div className="enhanced-content">
          {/* Key Stats Comparison - Broadcast Style */}
          <TeamVsTeamComparison homeTeam={homeTeam} awayTeam={awayTeam} currentSpread={currentSpread} />

          {/* Spread Performance Chart */}
          <SpreadPerformanceChart homeTeam={homeTeam} awayTeam={awayTeam} />

          {/* Radar Comparison */}
          <RadarComparison homeTeam={homeTeam} awayTeam={awayTeam} />

          {/* Points Trends */}
          <PointsTrendsChart homeTeam={homeTeam} awayTeam={awayTeam} />

          {/* Weekly Performance Tables */}
          <WeeklyPerformanceTables homeTeam={homeTeam} awayTeam={awayTeam} />
        </div>
      </div>
    </div>
  );
}

// Header Component
function ModalHeader({ homeTeam, awayTeam, currentSpread, currentWeek, onClose }) {
  return (
    <div className="enhanced-header">
      <div className="header-content">
        <h2>WEEK {currentWeek}</h2>
        <div className="matchup-display">
          <span className="team-name away">{awayTeam.abbreviation}</span>
          <span className="vs-symbol">@</span>
          <span className="team-name home">{homeTeam.abbreviation}</span>
        </div>
      </div>
      <button className="enhanced-close-btn" onClick={onClose}>×</button>
    </div>
  );
}

// Team vs Team Comparison - Broadcast Style
function TeamVsTeamComparison({ homeTeam, awayTeam, currentSpread }) {
  console.log("current spread", currentSpread);
  const awayIsFavorite = currentSpread?.favoredTeam === awayTeam.id;
  const homeIsFavorite = currentSpread?.favoredTeam === homeTeam.id;

  console.log(awayIsFavorite);
  console.log(homeIsFavorite);

  // Calculate spread display for each team
  const awaySpread = awayIsFavorite ? `-${currentSpread.spread || currentSpread.value}` : homeIsFavorite ? `+${currentSpread.spread || currentSpread.value}` : 'PK';

  const homeSpread = homeIsFavorite
    ? `-${currentSpread.spread || currentSpread.value}`
    : awayIsFavorite
    ? `+${currentSpread.spread || currentSpread.value}`
    : 'PK';


  const stats = [
    {
      label: 'RECORD',
      awayValue: awayTeam.analytics.seasonRecord?.formatted || 'N/A',
      homeValue: homeTeam.analytics.seasonRecord?.formatted || 'N/A',
      awayPercent: parseFloat((awayTeam.analytics.seasonRecord?.wins || 0)),
      homePercent: parseFloat((homeTeam.analytics.seasonRecord?.wins || 0)),
      hidePercentage: true
    },
    {
      label: 'ATS TOTAL',
      awayValue: `${awayTeam.analytics.spreadRecord.wins}-${awayTeam.analytics.spreadRecord.losses}`,
      homeValue: `${homeTeam.analytics.spreadRecord.wins}-${homeTeam.analytics.spreadRecord.losses}`,
      awayPercent: parseFloat(awayTeam.analytics.spreadRecord.percentage),
      homePercent: parseFloat(homeTeam.analytics.spreadRecord.percentage),
    },
    {
      label: 'ATS',
      awayValue: `${awayTeam.analytics.awayRecord.wins}-${awayTeam.analytics.awayRecord.losses}`,
      homeValue: `${homeTeam.analytics.homeRecord.wins}-${homeTeam.analytics.homeRecord.losses}`,
      awayPercent: parseFloat(awayTeam.analytics.awayRecord.wins),
      awayLabel: 'AWAY',
      homePercent: parseFloat(homeTeam.analytics.homeRecord.wins),
      homeLabel: '@ HOME'
    },
    {
      label: 'ATS',
      awayValue: !awayIsFavorite ? `${awayTeam.analytics.underdogRecord.wins}-${awayTeam.analytics.underdogRecord.losses}` : `${awayTeam.analytics.favoriteRecord.wins}-${awayTeam.analytics.favoriteRecord.losses}`,
      homeValue: !homeIsFavorite ? `${homeTeam.analytics.underdogRecord.wins}-${homeTeam.analytics.underdogRecord.losses}` : `${homeTeam.analytics.favoriteRecord.wins}-${homeTeam.analytics.favoriteRecord.losses}`,
      awayPercent: !awayIsFavorite ? parseFloat(awayTeam.analytics.underdogRecord.wins) : parseFloat(awayTeam.analytics.favoriteRecord.wins),
      homePercent: !homeIsFavorite ? parseFloat(homeTeam.analytics.underdogRecord.wins) : parseFloat(homeTeam.analytics.favoriteRecord.wins),
      awayLabel: !awayIsFavorite ? `UNDERDOG` : `FAVORITE`,
      homeLabel: !homeIsFavorite ? `UNDERDOG` : `FAVORITE`
    },
    {
      label: 'AVG PTS SCORED',
      awayValue: awayTeam.analytics.pointsStats.scored.mean.toFixed(1),
      homeValue: homeTeam.analytics.pointsStats.scored.mean.toFixed(1),
      awayPercent: null,
      homePercent: null,
      isNumeric: true,
    },
    {
      label: 'AVG PTS ALLOWED',
      awayValue: awayTeam.analytics.pointsStats.allowed.mean.toFixed(1),
      homeValue: homeTeam.analytics.pointsStats.allowed.mean.toFixed(1),
      awayPercent: null,
      homePercent: null,
      isNumeric: true,
      lowerIsBetter: true,
    },
  ];

  return (
    <div className="broadcast-matchup">

      {/* Stats Grid */}
      <div className="stats-comparison-grid">
        <BroadcastStatRow
            label="AT"
            awayValue={`${awayTeam.abbreviation} ${awaySpread}`}
            homeValue={`${homeTeam.abbreviation} ${homeSpread}`}
            awayPercent={null}
            homePercent={null}
            awayBackground={`#${awayTeam.color}`}
            homeBackground={`#${homeTeam.color}`}
            awayBorder={`2px solid #${awayTeam.alternateColor}`}
            homeBorder={`2px solid #${homeTeam.alternateColor}`}
          />
        {stats.map((stat, idx) => (
          <BroadcastStatRow
            key={idx}
            label={stat.label}
            awayValue={stat.awayValue}
            homeValue={stat.homeValue}
            awayPercent={stat.awayPercent}
            homePercent={stat.homePercent}
            awayLabel={stat.awayLabel}
            homeLabel={stat.homeLabel}
            isNumeric={stat.isNumeric}
            lowerIsBetter={stat.lowerIsBetter}
            hidePercentage={stat.hidePercentage}
          />
        ))}
      </div>
    </div>
  );
}

// Broadcast-style Stat Row
function BroadcastStatRow({ label, awayValue, homeValue, awayPercent, homePercent, isNumeric, lowerIsBetter, homeBackground, awayBackground, homeBorder, awayBorder, homeLabel, awayLabel, hidePercentage }) {
  // Determine which side is better
  let awayBetter = false;
  let homeBetter = false;

  if (awayPercent !== null && homePercent !== null) {
    awayBetter = awayPercent > homePercent;
    homeBetter = homePercent > awayPercent;
  } else if (isNumeric) {
    const awayNum = parseFloat(awayValue);
    const homeNum = parseFloat(homeValue);
    if (lowerIsBetter) {
      awayBetter = awayNum < homeNum;
      homeBetter = homeNum < awayNum;
    } else {
      awayBetter = awayNum > homeNum;
      homeBetter = homeNum > awayNum;
    }
  }

  return (
    <div className="broadcast-stat-row">
      <div className={`stat-cell away ${awayBetter ? 'advantage' : ''}`} style={{backgroundColor: awayBackground ?? '', border: awayBorder ?? ''}}>
        <div className="stat-value">{awayValue}</div>
        {
          (!awayLabel) ?
            (awayPercent !== null && !hidePercentage) && <div className="stat-percent">({awayPercent}%)</div> :
            <div className="stat-percent">{awayLabel}</div>
        }
      </div>
      <div className="stat-label">{label}</div>
      <div className={`stat-cell home ${homeBetter ? 'advantage' : ''}`} style={{backgroundColor: homeBackground ?? '', border: homeBorder ?? ''}}>
        <div className="stat-value">{homeValue}</div>
        {
          (!homeLabel) ?
            (homePercent !== null && !hidePercentage) && <div className="stat-percent">({homePercent}%)</div> :
            <div className="stat-percent">{homeLabel}</div>
        }      
      </div>
    </div>
  );
}

// Spread Performance Bar Chart
function SpreadPerformanceChart({ homeTeam, awayTeam }) {
  const data = [
    {
      category: 'Overall ATS',
      [homeTeam.abbreviation]: parseFloat(homeTeam.analytics.spreadRecord.percentage) || 0,
      [awayTeam.abbreviation]: parseFloat(awayTeam.analytics.spreadRecord.percentage) || 0
    },
    {
      category: 'As Favorite',
      [homeTeam.abbreviation]: parseFloat(homeTeam.analytics.favoriteRecord.percentage) || 0,
      [awayTeam.abbreviation]: parseFloat(awayTeam.analytics.favoriteRecord.percentage) || 0
    },
    {
      category: 'As Underdog',
      [homeTeam.abbreviation]: parseFloat(homeTeam.analytics.underdogRecord.percentage) || 0,
      [awayTeam.abbreviation]: parseFloat(awayTeam.analytics.underdogRecord.percentage) || 0
    },
    {
      category: 'Home/Away',
      [homeTeam.abbreviation]: parseFloat(homeTeam.analytics.homeRecord.percentage) || 0,
      [awayTeam.abbreviation]: parseFloat(awayTeam.analytics.awayRecord.percentage) || 0
    }
  ];

  return (
    <div className="chart-section">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2c3e50" />
          <XAxis dataKey="category" stroke="#ecf0f1" />
          <YAxis stroke="#ecf0f1" domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2ecc71' }} />
          <Legend />
          <Bar dataKey={homeTeam.abbreviation} fill="#3498db" />
          <Bar dataKey={awayTeam.abbreviation} fill="#e74c3c" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Radar Chart Comparison
function RadarComparison({ homeTeam, awayTeam }) {
  const data = [
    {
      metric: 'Overall ATS %',
      [homeTeam.abbreviation]: parseFloat(homeTeam.analytics.spreadRecord.percentage) || 0,
      [awayTeam.abbreviation]: parseFloat(awayTeam.analytics.spreadRecord.percentage) || 0,
      fullMark: 100
    },
    {
      metric: 'Offensive Power',
      [homeTeam.abbreviation]: Math.min(parseFloat(homeTeam.analytics.pointsStats.scored.mean) * 3, 100),
      [awayTeam.abbreviation]: Math.min(parseFloat(awayTeam.analytics.pointsStats.scored.mean) * 3, 100),
      fullMark: 100
    },
    {
      metric: 'Defensive Strength',
      [homeTeam.abbreviation]: Math.max(100 - (parseFloat(homeTeam.analytics.pointsStats.allowed.mean) * 3), 0),
      [awayTeam.abbreviation]: Math.max(100 - (parseFloat(awayTeam.analytics.pointsStats.allowed.mean) * 3), 0),
      fullMark: 100
    },
    {
      metric: 'Consistency',
      [homeTeam.abbreviation]: homeTeam.analytics.totalGames > 0 ? (homeTeam.analytics.spreadRecord.wins / homeTeam.analytics.totalGames * 100) : 0,
      [awayTeam.abbreviation]: awayTeam.analytics.totalGames > 0 ? (awayTeam.analytics.spreadRecord.wins / awayTeam.analytics.totalGames * 100) : 0,
      fullMark: 100
    }
  ];

  return (
    <div className="chart-section">
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={data}>
          <PolarGrid stroke="#2c3e50" />
          <PolarAngleAxis dataKey="metric" stroke="#ecf0f1" />
          <PolarRadiusAxis domain={[0, 100]} stroke="#ecf0f1" />
          <Radar name={homeTeam.abbreviation} dataKey={homeTeam.abbreviation} stroke="#3498db" fill="#3498db" fillOpacity={0.6} />
          <Radar name={awayTeam.abbreviation} dataKey={awayTeam.abbreviation} stroke="#e74c3c" fill="#e74c3c" fillOpacity={0.6} />
          <Legend />
          <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2ecc71' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Points Trends Line Chart
function PointsTrendsChart({ homeTeam, awayTeam }) {
  const maxLength = Math.max(homeTeam.analytics.weeklyData.length, awayTeam.analytics.weeklyData.length);
  const data = [];

  let homeCoverCumulative = 0;
  let awayCoverCumulative = 0;

  for (let i = 0; i < maxLength; i++) {
    const homeData = homeTeam.analytics.weeklyData[i];
    const awayData = awayTeam.analytics.weeklyData[i];

    homeCoverCumulative += homeData.covered ? 1 : 0;
    awayCoverCumulative += awayData.covered ? 1 : 0

    data.push({
      week: homeData?.week || awayData?.week || i + 1,
      [`${homeTeam.abbreviation}`]: homeCoverCumulative || 0,
      [`${awayTeam.abbreviation}`]: awayCoverCumulative || 0,
    });
  }

  return (
    <div className="chart-section">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2c3e50" />
          <YAxis stroke="#ecf0f1" label={{ value: 'Covers', angle: -90, position: 'insideLeft' }} />
          <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2ecc71' }} />
          <Legend />
          <Line type="monotone" dataKey={`${homeTeam.abbreviation}`} stroke="#3498db" strokeWidth={2} />
          <Line type="monotone" dataKey={`${awayTeam.abbreviation}`} stroke="#e74c3c" strokeWidth={2} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Weekly Performance Tables
function WeeklyPerformanceTables({ homeTeam, awayTeam }) {
  return (
    <div className="weekly-tables-section">
      <div className="tables-grid">
        <WeeklyTable team={homeTeam} />
        <WeeklyTable team={awayTeam} />
      </div>
    </div>
  );
}

function WeeklyTable({ team }) {
  return (
    <div className="weekly-table-container">
      <h4>{team.name}</h4>
      <div className="table-wrapper">
        <table className="weekly-table">
          <thead>
            <tr>
              <th>Wk</th>
              <th>Opp</th>
              <th>H/A</th>
              <th>F/U</th>
              <th>Spread</th>
              <th>Pts</th>
              <th>PA</th>
              <th>Cover</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {team.analytics.weeklyData.map((week, idx) => (
              <tr key={idx} className={week.covered ? 'row-covered' : 'row-missed'}>
                <td>{week.week}</td>
                <td>{week.opponent}</td>
                <td>{week.isHome ? 'H' : 'A'}</td>
                <td>{week.isFavorite ? 'F' : 'U'}</td>
                <td>{week.spread.toFixed(1)}</td>
                <td>{week.pointsScored}</td>
                <td>{week.pointsAllowed}</td>
                <td className="cover-icon">{week.covered ? '✓' : '✗'}</td>
                <td className={week.coverMargin > 0 ? 'positive' : 'negative'}>
                  {week.coverMargin?.toFixed(1) || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EnhancedAnalyticsModal;
