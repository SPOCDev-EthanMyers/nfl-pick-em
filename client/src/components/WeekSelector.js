import React, { useState } from 'react';
import './WeekSelector.css';

function WeekSelector({ currentWeek, weeks, onWeekChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleWeekSelect = (week) => {
    onWeekChange(week);
    setIsOpen(false);
  };

  return (
    <div className="week-selector">
      <div
        className="week-display"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="week-label">WEEK</span>
        <span className="week-number">{currentWeek}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="week-dropdown">
          <div className="week-dropdown-content">
            {weeks.map((week) => (
              <div
                key={week.week}
                className={`week-option ${week.week === currentWeek ? 'active' : ''}`}
                onClick={() => handleWeekSelect(week.week)}
              >
                <span className="option-label">Week {week.week}</span>
                <span className="option-dates">
                  {formatDate(week.start)} - {formatDate(week.end)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format dates from YYYYMMDD to MM/DD
function formatDate(dateString) {
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  return `${month}/${day}`;
}

export default WeekSelector;
