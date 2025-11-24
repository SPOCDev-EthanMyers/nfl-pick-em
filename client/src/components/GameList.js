import React from 'react';
import './GameList.css';

function GameList({ games, spreads }) {
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
            <div key={game.id} className="game-wrapper">
              <div className="game-card">
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
    </div>
  );
}

export default GameList;
