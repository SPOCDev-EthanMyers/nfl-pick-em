import React from 'react';
import './PlayerList.css';

function PlayerList({ games, players, spreads, onSelectionToggle }) {
  // Helper function to get team for selection
  const getSelectedTeam = (game, teamId) => {
    if (!teamId) return null;
    if (game.homeTeam.id === teamId) return game.homeTeam;
    if (game.awayTeam.id === teamId) return game.awayTeam;
    return null;
  };

  // Helper function to calculate who covered the spread
  const calculateSpreadWinner = (game, spread) => {
    if (!spread) return null;

    const awayScore = parseFloat(game.awayTeam.score);
    const homeScore = parseFloat(game.homeTeam.score);

    if (isNaN(awayScore) || isNaN(homeScore)) return null;

    const favoredTeamId = spread.favoredTeam;
    const spreadValue = parseFloat(spread.spread);
    const pointDifferential = homeScore - awayScore;

    if (favoredTeamId === game.homeTeam.id) {
      // Home team favored
      if (pointDifferential > spreadValue) {
        return game.homeTeam.id; // Home covered
      } else if (pointDifferential < spreadValue) {
        return game.awayTeam.id; // Away covered
      }
    } else if (favoredTeamId === game.awayTeam.id) {
      // Away team favored
      const awayPointDifferential = awayScore - homeScore;
      if (awayPointDifferential > spreadValue) {
        return game.awayTeam.id; // Away covered
      } else if (awayPointDifferential < spreadValue) {
        return game.homeTeam.id; // Home covered
      }
    }

    return null; // Push or no winner
  };

  // Calculate accuracy stats for a player
  const calculatePlayerStats = (player) => {
    let wins = 0;
    let picks = 0;

    games.forEach(game => {
      const isGameComplete = game.status === 'Final' || game.status === 'Final/OT';
      if (!isGameComplete) return;

      const selection = player.selections?.[game.id];
      if (!selection) return; // Don't count games where player didn't make a pick

      picks++;

      const spread = spreads[game.id];
      const winner = calculateSpreadWinner(game, spread);

      if (winner && selection === winner) {
        wins++;
      }
    });

    return { wins, picks };
  };

  return (
    <div className="player-list">
      <div className="player-list-header">
        <h2>Players & Picks</h2>
      </div>
      <div className="players-container">
        {players.length === 0 ? (
          <div className="no-players">
            <p>No players added yet. Use the Admin Panel to add players.</p>
          </div>
        ) : (
          <div className="players-grid">
            {/* Column headers - Games */}
            <div className="grid-header">
              <div className="player-name-header">Player</div>
              <div className="games-header">
                {games.map(game => (
                  <div key={game.id} className="game-header-cell">
                    <div className="matchup-mini">
                      {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Player rows */}
            {players.map(player => {
              const { wins, picks } = calculatePlayerStats(player);
              const percentage = picks > 0 ? ((wins / picks) * 100).toFixed(0) : 0;

              return (
                <div key={player.name} className="player-row">
                  <div className="player-name-cell">
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <div className="player-stats">
                        <span className="stats-record">{wins}-{picks - wins}</span>
                        <span className="stats-percentage">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="player-selections">
                    {games.map(game => {
                      const selection = player.selections?.[game.id];
                      const selectedTeam = getSelectedTeam(game, selection);
                      const isGameComplete = game.status === 'Final' || game.status === 'Final/OT';

                      // Check if this pick won
                      let isWinner = false;
                      if (isGameComplete && selection) {
                        const spread = spreads[game.id];
                        const winner = calculateSpreadWinner(game, spread);
                        isWinner = winner && selection === winner;
                      }

                      return (
                        <div
                          key={game.id}
                          className={`selection-cell ${selectedTeam ? 'has-selection' : 'no-selection'} ${isWinner ? 'winner' : ''}`}
                          onClick={() => onSelectionToggle(player.name, game.id, selection)}
                          style={
                            selectedTeam
                              ? {
                                  backgroundColor: `#${selectedTeam.color}`,
                                  borderColor: `#${selectedTeam.alternateColor}`
                                }
                              : {}
                          }
                        >
                          {isWinner && (
                            <div className="win-checkmark">✓</div>
                          )}
                          {selectedTeam ? (
                            <div className="selection-content">
                              <span className="selected-team">
                                {selectedTeam.abbreviation}
                              </span>
                            </div>
                          ) : (
                            <div className="selection-placeholder">-</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerList;
