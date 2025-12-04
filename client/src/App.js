import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import AdminPanel from './components/AdminPanel';
import GameList from './components/GameList';
import PlayerList from './components/PlayerList';
import WeekSelector from './components/WeekSelector';

function App() {
  const [games, setGames] = useState([]);
  const [spreads, setSpreads] = useState({});
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({ currentWeek: 1 });
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  // Fetch weeks on component mount
  useEffect(() => {
    fetchWeeks();
  }, []);

  // Fetch week-specific data when currentWeek changes
  useEffect(() => {
    if (weeks.length > 0) {
      fetchWeekData(currentWeek);
    }
  }, [currentWeek, weeks.length]);

  const fetchWeeks = async () => {
    try {
      const [weeksRes, settingsRes] = await Promise.all([
        axios.get('/api/weeks'),
        axios.get('/api/settings')
      ]);

      setWeeks(weeksRes.data);
      const initialWeek = 14;
      setSettings(settingsRes.data);
      setCurrentWeek(initialWeek);
    } catch (error) {
      console.error('Error fetching weeks:', error);
      alert('Failed to load weeks data. Please check the server connection.');
    }
  };

  const fetchWeekData = async (week) => {
    setLoading(true);
    try {
      const [gamesRes, spreadsRes, playersRes] = await Promise.all([
        axios.get(`/api/games?week=${week}`),
        axios.get(`/api/spreads?week=${week}`),
        axios.get(`/api/players?week=${week}`)
      ]);

      setGames(gamesRes.data);
      setSpreads(spreadsRes.data);
      setPlayers(playersRes.data);
    } catch (error) {
      console.error('Error fetching week data:', error);
      alert('Failed to load data for week ' + week);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    await fetchWeekData(currentWeek);
  };

  // Handle spread update
  const handleSpreadUpdate = async (gameId, spread, favoredTeam) => {
    try {
      const response = await axios.post('/api/spreads', { gameId, spread, favoredTeam, week: currentWeek });
      setSpreads(response.data.spreads);
    } catch (error) {
      console.error('Error updating spread:', error);
      alert('Failed to update spread');
    }
  };

  // Handle week change from selector
  const handleWeekChange = async (newWeek) => {
    setCurrentWeek(newWeek);
    // Also update settings to remember the selected week
    try {
      await axios.post('/api/settings', { currentWeek: newWeek });
      setSettings({ currentWeek: newWeek });
    } catch (error) {
      console.error('Error updating week setting:', error);
    }
  };

  // Handle week update (from admin panel)
  const handleWeekUpdate = async (newWeek) => {
    handleWeekChange(newWeek);
  };

  // Handle player addition
  const handleAddPlayer = async (playerName) => {
    try {
      const response = await axios.post('/api/players', { name: playerName, selections: {}, week: currentWeek });
      setPlayers(response.data.players);
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Failed to add player');
    }
  };

  // Handle player deletion
  const handleDeletePlayer = async (playerName) => {
    try {
      const response = await axios.delete(`/api/players/${playerName}?week=${currentWeek}`);
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
      await axios.put(`/api/players/${playerName}/selection`, { gameId, teamId: newSelection, week: currentWeek });

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
          <WeekSelector
            currentWeek={currentWeek}
            weeks={weeks}
            onWeekChange={handleWeekChange}
          />
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
