import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AdminPanel from './components/AdminPanel';
import GameList from './components/GameList';
import PlayerList from './components/PlayerList';

function App() {
  const [games, setGames] = useState([]);
  const [spreads, setSpreads] = useState({});
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({ currentWeek: 1 });
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [gamesRes, spreadsRes, playersRes, settingsRes] = await Promise.all([
        axios.get('/api/games'),
        axios.get('/api/spreads'),
        axios.get('/api/players'),
        axios.get('/api/settings')
      ]);

      setGames(gamesRes.data);
      setSpreads(spreadsRes.data);
      setPlayers(playersRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data. Please check the server connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle spread update
  const handleSpreadUpdate = async (gameId, spread, favoredTeam) => {
    try {
      const response = await axios.post('/api/spreads', { gameId, spread, favoredTeam });
      setSpreads(response.data.spreads);
    } catch (error) {
      console.error('Error updating spread:', error);
      alert('Failed to update spread');
    }
  };

  // Handle week update
  const handleWeekUpdate = async (newWeek) => {
    try {
      const response = await axios.post('/api/settings', { currentWeek: newWeek });
      setSettings(response.data.settings);
    } catch (error) {
      console.error('Error updating week:', error);
      alert('Failed to update week');
    }
  };

  // Handle player addition
  const handleAddPlayer = async (playerName) => {
    try {
      const response = await axios.post('/api/players', { name: playerName, selections: {} });
      setPlayers(response.data.players);
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Failed to add player');
    }
  };

  // Handle player deletion
  const handleDeletePlayer = async (playerName) => {
    try {
      const response = await axios.delete(`/api/players/${playerName}`);
      setPlayers(response.data.players);
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Failed to delete player');
    }
  };

  // Handle selection toggle
  const handleSelectionToggle = async (playerName, gameId, currentSelection) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Toggle between home, away, or null
    let newSelection;
    if (currentSelection === game.homeTeam.id) {
      newSelection = game.awayTeam.id;
    } else if (currentSelection === game.awayTeam.id) {
      newSelection = null;
    } else {
      newSelection = game.homeTeam.id;
    }

    try {
      await axios.put(`/api/players/${playerName}/selection`, { gameId, teamId: newSelection });

      // Update local state
      setPlayers(prevPlayers =>
        prevPlayers.map(player => {
          if (player.name === playerName) {
            return {
              ...player,
              selections: {
                ...player.selections,
                [gameId]: newSelection
              }
            };
          }
          return player;
        })
      );
    } catch (error) {
      console.error('Error updating selection:', error);
      alert('Failed to update selection');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading NFL Games...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🏈 GRIDIRON GAUNTLET</h1>
          <div className="week-display">
            <span className="week-label">WEEK</span>
            <span className="week-number">{settings.currentWeek}</span>
          </div>
          <button
            className="admin-toggle"
            onClick={() => setShowAdmin(!showAdmin)}
          >
            {showAdmin ? 'Hide Admin' : 'Show Admin'}
          </button>
        </div>
      </header>

      {/* Admin Panel */}
      {showAdmin && (
        <AdminPanel
          games={games}
          spreads={spreads}
          players={players}
          currentWeek={settings.currentWeek}
          onSpreadUpdate={handleSpreadUpdate}
          onWeekUpdate={handleWeekUpdate}
          onAddPlayer={handleAddPlayer}
          onDeletePlayer={handleDeletePlayer}
          onRefresh={fetchAllData}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        {games.length === 0 ? (
          <div className="no-games">
            <p>No games found for this week.</p>
            <button onClick={fetchAllData}>Refresh</button>
          </div>
        ) : (
          <div className="pick-em-grid">
            <GameList games={games} spreads={spreads} />
            <PlayerList
              games={games}
              players={players}
              spreads={spreads}
              onSelectionToggle={handleSelectionToggle}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
