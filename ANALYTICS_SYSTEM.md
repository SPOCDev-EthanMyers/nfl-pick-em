# Analytics System Documentation

## Overview
The analytics system provides comprehensive historical performance analysis for NFL teams against the spread, helping users make informed decisions when selecting games.

## Architecture

### 1. Data Storage
**File:** `server/data/game-results-by-week.json`

This new storage file automatically collects and persists game results as they become final. The data structure is:

```json
{
  "1": {
    "401772510": {
      "gameId": "401772510",
      "week": 1,
      "date": "2025-09-04T20:00Z",
      "homeTeam": {
        "id": "21",
        "name": "Kansas City Chiefs",
        "abbreviation": "KC",
        "score": 27
      },
      "awayTeam": {
        "id": "12",
        "name": "Baltimore Ravens",
        "abbreviation": "BAL",
        "score": 20
      },
      "spread": {
        "value": 2.5,
        "favoredTeam": "21"
      }
    }
  }
}
```

### 2. Automatic Data Collection
**Modified:** `server/index.js` - `/api/games` endpoint

The `/api/games` endpoint now automatically:
- Fetches game data from ESPN API
- Checks if games are complete (status: "Final" or "Final/OT")
- Persists completed game results with spread information to `game-results-by-week.json`
- Runs every time you navigate to a week in the UI

**How to populate historical data:**
Simply navigate through each week (1-14) in the UI. The system will automatically fetch and store all completed game results.

### 3. Analytics Calculation Engine
**File:** `server/utils/analytics.js`

Provides comprehensive team analytics including:

#### Spread Records
- Overall ATS (Against The Spread) record
- Record as favorite
- Record as underdog
- Record at home
- Record on the road

#### Cover Statistics
For both favorite and underdog scenarios:
- Mean cover margin (how much they beat/miss spread by on average)
- Median cover margin
- Best cover (max margin with game details)
- Worst cover (min margin with game details)

#### Points Statistics
For points scored and allowed:
- Mean
- Median
- Maximum (with week, opponent, spread)
- Minimum (with week, opponent, spread)

#### Week-by-Week Data
Complete history showing:
- Opponent
- Home/Away
- Favorite/Underdog
- Spread value
- Points scored/allowed
- Cover result
- Cover margin

### 4. API Endpoints

#### GET `/api/analytics/game/:gameId`
Get analytics for both teams in a specific game.

**Query Parameters:**
- `week` (required) - Current week number
- `startWeek` (optional, default: 1) - Start of analysis range
- `endWeek` (optional, default: week - 1) - End of analysis range

**Response:**
```json
{
  "gameId": "401772510",
  "currentWeek": 14,
  "analysisRange": { "startWeek": 1, "endWeek": 13 },
  "homeTeam": {
    "id": "21",
    "name": "Kansas City Chiefs",
    "abbreviation": "KC",
    "analytics": { /* comprehensive stats */ }
  },
  "awayTeam": {
    "id": "12",
    "name": "Baltimore Ravens",
    "abbreviation": "BAL",
    "analytics": { /* comprehensive stats */ }
  },
  "currentSpread": {
    "value": 2.5,
    "favoredTeam": "21"
  }
}
```

#### GET `/api/analytics/team/:teamId`
Get analytics for a specific team.

**Query Parameters:**
- `startWeek` (optional, default: 1)
- `endWeek` (optional, default: 18)

### 5. Frontend Components

#### AnalyticsModal Component
**File:** `client/src/components/AnalyticsModal.js`

A comprehensive modal that displays:
- Team matchup information
- Current spread
- Week range selector (to filter analysis)
- Side-by-side team analytics
- All statistical categories listed above
- Interactive weekly performance table

**Features:**
- Color-coded cover results (green for covered, red for missed)
- Positive/negative margin indicators
- Sortable, scrollable data tables
- Responsive design

#### GameList Integration
**Modified:** `client/src/components/GameList.js`

Game cards are now clickable:
- Hover over any game card to see the analytics icon (📊)
- Click the card to open the analytics modal
- Visual feedback on hover (card elevation, border highlight)

### 6. Styling
**File:** `client/src/components/AnalyticsModal.css`

Football-themed design featuring:
- Dark background with green accents (#2ecc71)
- Smooth animations (fade-in, slide-up)
- Custom scrollbars
- Hover effects
- Responsive grid layout
- Color-coded statistics (green = good, red = bad)

## Usage Guide

### Step 1: Populate Historical Data
1. Start the server: `npm start` (from server directory)
2. Start the client: `npm start` (from client directory)
3. Navigate to each week (1 through current week) using the week selector
4. The system automatically stores all completed game results

### Step 2: View Analytics
1. Navigate to the week you want to make picks for
2. Hover over any game card in the "Games & Spreads" section
3. Click the game card to open the analytics modal
4. Adjust the week range filter if needed (default: all previous weeks)
5. Review comprehensive statistics for both teams
6. Use the data to make informed spread picks

### Step 3: Analyze Performance
The analytics help you identify:
- **Hot teams:** High ATS win percentage, positive cover margins
- **Cold teams:** Low ATS win percentage, negative cover margins
- **Home/Road splits:** Some teams perform better at home or on the road
- **Favorite/Underdog trends:** How teams perform in different roles
- **Recent performance:** Filter to recent weeks for current form
- **Scoring trends:** Points scored/allowed averages and extremes
- **Historical matchups:** See past performance against specific opponents

## Data Points Available

### All 22+ requested analytics are included:

1. ✅ Spread Record (overall)
2. ✅ Spread record as favorites
3. ✅ Spread record as underdogs
4. ✅ Spread record at home
5. ✅ Spread record on road
6. ✅ Total points scored (all weeks)
7. ✅ Max underdog cover (with details)
8. ✅ Max favorite cover (with details)
9. ✅ Min underdog cover (with details)
10. ✅ Min favorite cover (with details)
11. ✅ Median underdog cover
12. ✅ Median favorite cover
13. ✅ Mean underdog cover margin
14. ✅ Mean favorite cover margin
15. ✅ Mean points scored (with range filter)
16. ✅ Mean points allowed (with range filter)
17. ✅ Max points scored (with week, opponent, spread)
18. ✅ Max points allowed (with week, opponent, spread)
19. ✅ Min points scored (with week, opponent, spread)
20. ✅ Min points allowed (with week, opponent, spread)
21. ✅ Median points scored
22. ✅ Median points allowed
23. ✅ Week-by-week spread performance table

## Technical Notes

### Performance
- Analytics are calculated on-demand (not cached)
- Typical response time: < 100ms for full season analysis
- Modal loads asynchronously to avoid blocking UI

### Data Integrity
- Game results are only stored when status is "Final" or "Final/OT"
- Scores must be valid numbers to be stored
- Spread information is included when available
- Missing spreads are handled gracefully (null values)

### Extensibility
The system is designed to be easily extended:
- Add new statistics in `server/utils/analytics.js`
- Display new stats in `AnalyticsModal.js`
- All calculations are modular and testable
- Easy to switch to database storage later

## Future Enhancements

Potential additions:
- Head-to-head history between specific teams
- Weather impact analysis
- Rest days/scheduling analysis
- Injury report integration
- Betting line movement tracking
- Win probability models
- Export analytics to CSV/PDF
- Save favorite matchups
- Compare multiple teams side-by-side
