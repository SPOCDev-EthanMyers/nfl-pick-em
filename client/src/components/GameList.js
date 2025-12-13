import React, { useState, useEffect } from 'react';
import './GameList.css';
import EnhancedAnalyticsModal from './EnhancedAnalyticsModal';
import BacktestModal from './BacktestModal';

function GameList({ games, spreads, currentWeek }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [modalType, setModalType] = useState('analytics'); // 'analytics' or 'backtest'

  // Track previous spreads and changed games for highlighting
  const [prevSpreads, setPrevSpreads] = useState({});
  const [changedGames, setChangedGames] = useState(new Set());

  // Detect changes when spreads update
  useEffect(() => {
    const changed = new Set();

    Object.keys(spreads).forEach(gameId => {
      if (prevSpreads[gameId] &&
          spreads[gameId]?.spread !== prevSpreads[gameId]?.spread) {
        changed.add(gameId);
      }
    });

    setChangedGames(changed);
    setPrevSpreads(spreads);

    // Clear highlights after 3 seconds
    if (changed.size > 0) {
      setTimeout(() => setChangedGames(new Set()), 3000);
    }
  }, [spreads]);

  // Helper function to calculate spread coverage
  const calculateSpreadResult = (game, spread) => {
    if (!spread) {
      return { coveredTeam: null, displaySpread: null, isPush: false };
    }

    const awayScore = parseFloat(game.awayTeam.score);
    const homeScore = parseFloat(game.homeTeam.score);

    // Can't calculate if scores aren't valid
    if (isNaN(awayScore) || isNaN(homeScore)) {
      return { coveredTeam: null, displaySpread: null, isPush: false };
    }

    const favoredTeamId = spread.favoredTeam;
    const spreadValue = parseFloat(spread.spread);
    const pointDifferential = homeScore - awayScore;

    let coveredTeam = null;
    let displaySpread = null;
    let isPush = false;

    if (favoredTeamId === game.homeTeam.id) {
      // Home team is favored
      if (pointDifferential > spreadValue) {
        // Home covered (favorite won)
        coveredTeam = game.homeTeam.id;
        displaySpread = `-${spreadValue}`;
      } else if (pointDifferential < spreadValue) {
        // Away covered (underdog won)
        coveredTeam = game.awayTeam.id;
        displaySpread = `+${spreadValue}`;
      } else {
        // Push
        isPush = true;
        displaySpread = `±${spreadValue}`;
      }
    } else if (favoredTeamId === game.awayTeam.id) {
      // Away team is favored
      const awayPointDifferential = awayScore - homeScore;
      if (awayPointDifferential > spreadValue) {
        // Away covered (favorite won)
        coveredTeam = game.awayTeam.id;
        displaySpread = `-${spreadValue}`;
      } else if (awayPointDifferential < spreadValue) {
        // Home covered (underdog won)
        coveredTeam = game.homeTeam.id;
        displaySpread = `+${spreadValue}`;
      } else {
        // Push
        isPush = true;
        displaySpread = `±${spreadValue}`;
      }
    }

    return { coveredTeam, displaySpread, isPush };
  };

  const handleGameClick = (game) => {
    const gameWithSpread = {
      ...game,
      spread: spreads[game.id]
    };
    setSelectedGame(gameWithSpread);

    // Determine modal type based on game status
    const isGameComplete = game.status === 'Final' || game.status === 'Final/OT';
    setModalType(isGameComplete ? 'backtest' : 'analytics');
  };

  const handleCloseModal = () => {
    setSelectedGame(null);
    setModalType('analytics');
  };

  return (
    <div className="game-list">
      <div className="game-list-header">
        <h2>Games & Spreads</h2>
      </div>
      <div className="games-container">
        {games.map(game => {
          const spread = spreads[game.id];
          const favoredTeamId = spread?.favoredTeam;
          const spreadValue = spread?.spread || 0;
          const isGameComplete = game.status === 'Final' || game.status === 'Final/OT';

          // Calculate spread result for completed games
          const { coveredTeam, displaySpread, isPush } = isGameComplete
            ? calculateSpreadResult(game, spread)
            : { coveredTeam: null, displaySpread: null, isPush: false };

          return (
            <div key={game.id} className="game-wrapper analytics-clickable" data-game-id={game.id}>
              <div className="analytics-overlay">
                <div className="analytics-text">
                  <span>Analyze</span>
                </div>
              </div>
              <div
                className={`game-card ${changedGames.has(game.id) ? 'highlight-change' : ''}`}
                onClick={() => handleGameClick(game)}
              >
                {/* Away Team */}
                <div
                  className={`team-block ${
                    !isGameComplete && favoredTeamId === game.awayTeam.id ? 'favored' : ''
                  } ${
                    isGameComplete && coveredTeam === game.awayTeam.id ? 'covered' : ''
                  }`}
                  style={{
                    backgroundColor: `#${game.awayTeam.color}`,
                    borderColor: `#${game.awayTeam.alternateColor}`
                  }}
                >
                  <div className="team-info-row">
                    <span className="team-abbr">{game.awayTeam.abbreviation}</span>
                    {isGameComplete && (
                      <span className="team-score">{game.awayTeam.score}</span>
                    )}
                  </div>
                  <div className="team-record">{game.awayTeam.record}</div>
                </div>

                {/* Spread Display */}
                <div className={`spread-display`}>
                  {spread && spreadValue > 0 ? (
                    <div className={`spread-value ${isGameComplete ? 'game-complete' : ''} ${isPush ? 'push' : ''}`}>
                      {isGameComplete && (
                        <div className="checkmark-tab">✓</div>
                      )}
                      {isGameComplete ? displaySpread : `-${spreadValue}`}
                    </div>
                  ) : (
                    <div className="spread-value no-spread">PK</div>
                  )}
                </div>

                {/* Home Team */}
                <div
                  className={`team-block ${
                    !isGameComplete && favoredTeamId === game.homeTeam.id ? 'favored' : ''
                  } ${
                    isGameComplete && coveredTeam === game.homeTeam.id ? 'covered' : ''
                  }`}
                  style={{
                    backgroundColor: `#${game.homeTeam.color}`,
                    borderColor: `#${game.homeTeam.alternateColor}`
                  }}
                >
                  <div className="team-info-row">
                    <span className="team-abbr">{game.homeTeam.abbreviation}</span>
                    {isGameComplete && (
                      <span className="team-score">{game.homeTeam.score}</span>
                    )}
                  </div>
                  <div className="team-record">{game.homeTeam.record}</div>
                </div>
              </div>
              {/* Game Info */}
              <div className="game-info">
                <div className="game-status">{game.statusDetail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedGame && modalType === 'analytics' && (
        <EnhancedAnalyticsModal
          game={selectedGame}
          week={currentWeek || 1}
          onClose={handleCloseModal}
        />
      )}

      {selectedGame && modalType === 'backtest' && (
        <BacktestModal
          game={selectedGame}
          week={currentWeek || 1}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default GameList;
