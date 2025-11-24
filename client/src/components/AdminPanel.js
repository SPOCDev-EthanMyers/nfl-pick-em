import React, { useState } from 'react';
import './AdminPanel.css';

function AdminPanel({
  games,
  spreads,
  players,
  currentWeek,
  onSpreadUpdate,
  onWeekUpdate,
  onAddPlayer,
  onDeletePlayer,
  onRefresh
}) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [weekInput, setWeekInput] = useState(currentWeek);
  const [spreadInputs, setSpreadInputs] = useState({});

  // Handle spread change for a game
  const handleSpreadChange = (gameId, value) => {
    setSpreadInputs(prev => ({
      ...prev,
      [gameId]: value
    }));
  };

  // Handle spread submission for a game
  const handleSpreadSubmit = (gameId, game) => {
    const spreadValue = spreadInputs[gameId];
    if (!spreadValue || isNaN(parseFloat(spreadValue))) {
      alert('Please enter a valid spread number');
      return;
    }

    // Always store as positive value
    const positiveSpread = Math.abs(parseFloat(spreadValue));

    // Use existing favored team if spread already exists, otherwise default to home team
    const currentSpread = spreads[gameId];
    const favoredTeam = currentSpread?.favoredTeam || game.homeTeam.id;

    onSpreadUpdate(gameId, positiveSpread, favoredTeam);
  };

  // Toggle which team is favored
  const handleToggleFavoredTeam = (gameId, game) => {
    const currentSpread = spreads[gameId];
    if (!currentSpread) {
      alert('Please set a spread first');
      return;
    }

    const newFavoredTeam =
      currentSpread.favoredTeam === game.homeTeam.id
        ? game.awayTeam.id
        : game.homeTeam.id;

    onSpreadUpdate(gameId, currentSpread.spread, newFavoredTeam);
  };

  // Handle week update
  const handleWeekSubmit = () => {
    if (weekInput && !isNaN(parseInt(weekInput))) {
      onWeekUpdate(parseInt(weekInput));
    }
  };

  // Handle add player
  const handleAddPlayerSubmit = (e) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-section">
        <h3>⚙️ Settings</h3>
        <div className="admin-controls">
          <div className="control-group">
            <label>Current Week:</label>
            <div className="input-group">
              <input
                type="number"
                min="1"
                max="18"
                value={weekInput}
                onChange={(e) => setWeekInput(e.target.value)}
              />
              <button onClick={handleWeekSubmit}>Update Week</button>
            </div>
          </div>
          <button className="refresh-btn" onClick={onRefresh}>
            🔄 Refresh All Data
          </button>
        </div>
      </div>

      <div className="admin-section">
        <h3>👥 Players</h3>
        <form onSubmit={handleAddPlayerSubmit} className="add-player-form">
          <input
            type="text"
            placeholder="Enter player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
          <button type="submit">Add Player</button>
        </form>
        <div className="players-list">
          {players.map(player => (
            <div key={player.name} className="player-item">
              <span>{player.name}</span>
              <button
                className="delete-btn"
                onClick={() => {
                  if (window.confirm(`Delete player "${player.name}"?`)) {
                    onDeletePlayer(player.name);
                  }
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section spreads-section">
        <h3>📊 Spreads</h3>
        <p className="spreads-instructions">
          Enter a positive number (e.g., 3 or 7.5), then use "Toggle Favorite" to switch which team is favored.
          The favored team shows with a negative spread (e.g., -3).
        </p>
        <div className="spreads-grid">
          {games.map(game => {
            const currentSpread = spreads[game.id];
            const favoredTeamId = currentSpread?.favoredTeam;

            return (
              <div key={game.id} className="spread-item">
                <div className="game-matchup">
                  <span
                    className={`team ${favoredTeamId === game.awayTeam.id ? 'favored' : ''}`}
                  >
                    {game.awayTeam.abbreviation}
                  </span>
                  <span className="at-symbol">@</span>
                  <span
                    className={`team ${favoredTeamId === game.homeTeam.id ? 'favored' : ''}`}
                  >
                    {game.homeTeam.abbreviation}
                  </span>
                </div>

                <div className="spread-controls">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Spread (e.g. 3, 7.5)"
                    value={spreadInputs[game.id] ?? currentSpread?.spread ?? ''}
                    onChange={(e) => handleSpreadChange(game.id, e.target.value)}
                  />
                  <button onClick={() => handleSpreadSubmit(game.id, game)}>
                    Set
                  </button>
                  <button
                    className="toggle-btn"
                    onClick={() => handleToggleFavoredTeam(game.id, game)}
                    disabled={!currentSpread}
                    title="Toggle which team is favored"
                  >
                    Toggle Favorite
                  </button>
                </div>

                {currentSpread && (
                  <div className="current-spread">
                    <strong>Current:</strong>{' '}
                    {favoredTeamId === game.homeTeam.id
                      ? game.homeTeam.abbreviation
                      : game.awayTeam.abbreviation}{' '}
                    -{Math.abs(currentSpread.spread)} (favored)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
