import React, { useState, useEffect } from 'react';
import './PlayerList.css';

function PlayerList({ games, players, spreads, onSelectionToggle }) {
  // Track previous player selections for highlighting changes
  const [prevSelections, setPrevSelections] = useState({});
  const [recentChanges, setRecentChanges] = useState({});

  // Detect changes when players update their selections
  useEffect(() => {
    const changes = {};

    players.forEach(player => {
      const prevPlayer = prevSelections[player.name];
      if (prevPlayer) {
        Object.keys(player.selections || {}).forEach(gameId => {
          if (player.selections[gameId] !== prevPlayer.selections?.[gameId]) {
            changes[`${player.name}-${gameId}`] = true;
          }
        });
      }
    });

    setRecentChanges(changes);
    setPrevSelections(
      players.reduce((acc, p) => ({ ...acc, [p.name]: p }), {})
    );

    // Clear highlights after 5 seconds
    if (Object.keys(changes).length > 0) {
      setTimeout(() => setRecentChanges({}), 5000);
    }
  }, [players]);

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
            {/* Player columns */}
            {players.map(player => {
              const { wins, picks } = calculatePlayerStats(player);
              const percentage = picks > 0 ? ((wins / picks) * 100).toFixed(0) : 0;

              return (
                <div key={player.name} className="player-column">
                  {/* Player Header */}
                  <div className="player-header">
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <div className="player-stats">
                        <span className="stats-record">{wins}-{picks - wins}</span>
                        <span className="stats-percentage">{percentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Player Picks */}
                  <div className="player-picks">
                    {games.map(game => {
                      const selection = player.selections?.[game.id];
                      const selectedTeam = getSelectedTeam(game, selection);
                      const isGameComplete = game.status === 'Final' || game.status === 'Final/OT';
                      const spread = spreads[game.id];

                      // Check if this pick won, lost, or pushed
                      let isWinner = false;
                      let isLoser = false;
                      let isPush = false;
                      if (isGameComplete && selection) {
                        const winner = calculateSpreadWinner(game, spread);
                        if (!winner) {
                          isPush = true;
                        } else if (selection === winner) {
                          isWinner = true;
                        } else {
                          isLoser = true;
                        }
                      }

                      // Determine spread display for selected team
                      let spreadDisplay = null;
                      if (selectedTeam && spread && spread.spread > 0) {
                        const isFavored = spread.favoredTeam === selectedTeam.id;
                        spreadDisplay = isFavored ? `-${spread.spread}` : `+${spread.spread}`;
                      } else if (selectedTeam && spread && spread.spread === 0) {
                        spreadDisplay = 'PK';
                      }

                      return (
                        <div key={game.id} className="pick-row">
                          <div className="game-label">
                            {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                          </div>
                          <div
                            className={`selection-cell ${selectedTeam ? 'has-selection' : 'no-selection'} ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''} ${isPush ? 'push' : ''} ${recentChanges[`${player.name}-${game.id}`] ? 'recently-changed' : ''}`}
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
                            {isLoser && (
                              <div className="loss-xmark">✗</div>
                            )}
                            {isPush && (
                              <div className="push-mark">-</div>
                            )}
                            {selectedTeam ? (
                              <div className="selection-content">
                                <span className="selected-team">
                                  {selectedTeam.abbreviation}
                                </span>
                                {spreadDisplay && (
                                  <span className="selected-spread">
                                    {spreadDisplay}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="selection-placeholder">-</div>
                            )}
                          </div>
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
