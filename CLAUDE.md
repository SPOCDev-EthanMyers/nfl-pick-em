
# Sports Pick 'Em App Instructions

## **Goal**
Build a sports application that allows users to challenge another player in a weekly NFL pick 'em contest **against the spread** for each game played that week.

---

## **Environment**
- Run locally on `localhost` for now.
- Use **React** for the frontend and **Node.js/Express** for the backend.
- Store data in a simple JSON file or lightweight database (e.g., SQLite or local storage).

---

## **Data Source**
- Fetch weekly NFL games from ESPN API: https://partners.api.espn.com/v2/sports/football/nfl/events?dates=YYYYMMDD-YYYYMMDD
- The `dates` query parameter should:
- Automatically calculate the range from **last Thursday through Tuesday**.
- Then fetch games for **next Thursday through Monday**.
- Example: If today is Monday, grab last Thursday → Tuesday, then next Thursday → Monday.

---

## **Features**

### **1. Admin Panel**
- Ability to set the **current week number**.
- Input spreads for each game (e.g., `BUF -2.5`, `IND -6`, `SEA -2`).
- Spreads should persist across sessions (store in JSON or DB).
- Ability to update spreads anytime.

### **2. Players**
- Dynamic list of players (each player has just a name).
- Each player gets a number of selections equal to the number of games that week.
- Admin can log selections for each player.

### **3. Game Display**
- Show all games horizontally with:
- Team abbreviations.
- Spread displayed between teams.
- Color blocks for teams (sporty theme).
- Players listed vertically with clickable cells for each game:
- Clicking toggles between the two teams for that game.

---

## **UI/UX Requirements**
- Sporty, football-themed design.
- Custom styles and imported fonts.
- Header:
- App title (catchy).
- Current week displayed prominently.
- Layout:
- Left side: games with spreads.
- Right side: players and their selections.
- Responsive design for desktop.

---

## **Technical Notes**
- Use **React hooks** for state management.
- Use **Express routes** for:
- Fetching games from ESPN API.
- Managing spreads and player data.
- Persist data locally (JSON or SQLite).
- No authentication required for now.

---

## **Deliverables**
- Full React + Node.js project structure.
- Components:
- `GameList` (shows games and spreads).
- `PlayerList` (shows players and selections).
- `AdminPanel` (manage week and spreads).
- API routes:
- `/api/games` → fetch games from ESPN.
- `/api/spreads` → get/set spreads.
- `/api/players` → manage players and selections.
- Styling:
- Football theme with custom fonts/colors.
- Ready to run application
---

## **Extra**
- Include comments in code for clarity.
- Make it easy to switch to a real database later.