# Backtest Analytics System

## Overview

The backtest system allows you to analyze completed games to identify which metrics would have predicted the winning spread pick. This helps you understand what factors are most predictive for future picks.

## How It Works

### Automatic Detection
- **Upcoming Games**: Clicking shows analytics modal with predictive stats
- **Completed Games**: Clicking shows backtest modal with outcome analysis

### Backtest Analysis

For each completed game, the system:

1. **Calculates Pre-Game Metrics**: Uses only data available BEFORE the game
   - Team stats up to but not including the target week
   - Spread win percentages (overall, as favorite, as underdog, home/away)
   - Offensive/defensive averages
   - Recent form (last 3 games)
   - Cover margins and trends

2. **Analyzes Game Outcome**: Determines who covered the spread
   - Identifies the winning pick (home or away team)
   - Calculates cover margin

3. **Metric Correlation**: Compares each metric for both teams
   - Determines if the metric predicted the correct winner
   - Calculates importance score based on:
     - Strength of difference between teams
     - Whether it predicted correctly (boosted score)

4. **Rankings**: Sorts metrics by predictive power
   - Shows which metrics supported the winning pick
   - Highlights metrics that went against the winner

## Key Metrics Analyzed

### Spread-Based Metrics
- **Overall Spread Win %**: Historical ATS performance
- **Favorite/Underdog Win %**: Context-specific ATS performance
- **Home/Away Win %**: Location-based ATS performance
- **Average Cover Margin**: How much teams typically beat/miss spreads by

### Performance Metrics
- **Avg Points Scored**: Offensive output
- **Avg Points Allowed**: Defensive strength
- **Point Differential**: Net scoring advantage
- **Season Win %**: Overall team quality

### Recent Form
- **Recent Points Scored**: Last 3 games offensive performance
- **Recent ATS Wins**: Last 3 games spread performance

## API Endpoints

### Get Backtest for Single Game
```
GET /api/backtest/game/:week/:gameId
```

Returns detailed analysis for a specific completed game including:
- Team metrics at the time of the game
- Game outcome and cover margin
- Metric correlations ranked by importance

### Get Backtest Range
```
GET /api/backtest/range?startWeek=1&endWeek=5
```

Analyzes multiple weeks and provides:
- Aggregate metric performance across all games
- Accuracy percentages for each metric
- Overall metric rankings

### Get Available Weeks
```
GET /api/backtest/weeks
```

Returns all weeks with completed games available for backtesting.

## Understanding the Results

### Metric Correlations Table
- **Green rows**: Metric correctly predicted the winner
- **Red rows**: Metric favored the wrong team
- **Importance Score**: 0-100 scale showing predictive strength
  - Higher scores = larger difference + correct prediction

### Visual Indicators
- **Cover Margin**: Positive = covered, negative = missed
- **Metrics Supporting/Against**: Count of metrics that predicted correctly/incorrectly
- **Category Badges**: Classify metrics (spread, offense, defense, location, overall, recent)

## Use Cases

### 1. Weekly Review
After each week's games complete, review what metrics were most predictive:
- Which teams' stats aligned with outcomes?
- Were favorites or underdogs more reliable this week?
- Did recent form matter more than season averages?

### 2. Metric Validation
Over multiple weeks, track which metrics consistently predict winners:
- Use `/api/backtest/range` to aggregate data
- Identify your most reliable indicators
- Adjust strategy based on historical accuracy

### 3. Team-Specific Insights
For specific matchups, check historical patterns:
- How does this team perform as favorite vs underdog?
- Does home/away split matter for them?
- Are they trend-buckers (stats don't predict outcomes)?

## Files Structure

### Backend
- `server/utils/backtest-analytics.js`: Core backtesting logic
  - `backtestGame()`: Single game analysis
  - `backtestWeekRange()`: Multi-week aggregation
  - `calculateTeamMetricsAtWeek()`: Historical metrics calculation
  - `analyzeCompletedGame()`: Metric correlation analysis

### Frontend
- `client/src/components/BacktestModal.js`: Backtest UI component
- `client/src/components/BacktestModal.css`: Styling
- `client/src/components/GameList.js`: Auto-routing to correct modal

### Data
- Uses existing `game-results-by-week.json` for historical data
- No additional data storage required

## Future Enhancements

Potential improvements:
- Machine learning model training on metric correlations
- Confidence scores for upcoming games based on historical accuracy
- Team-specific metric weights (some teams are more predictable)
- Weather/injury integration
- Time-series analysis for metric trends
