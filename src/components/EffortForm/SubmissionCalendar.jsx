import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const SubmissionCalendar = ({
  now = new Date(),
  datesWithDataMap,
  onDateSelect,
  cardRing = "",
  surface = "",
  textPrimary = "text-slate-800 dark:text-slate-100"
}) => {
  // Helper to format Date object into DD/MM/YYYY
  const formatDateToDDMMYYYY = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };

  // Determine classes for specific dates (colors the background)
  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const ddmmyyyy = formatDateToDDMMYYYY(date);
    const dateData = datesWithDataMap.get(ddmmyyyy);

    if (dateData) {
      return dateData.isOnLeave ? 'react-calendar__tile--leave' : 'react-calendar__tile--logged';
    }
    return null;
  };

  // Add the tiny status dots under the date numbers
  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const ddmmyyyy = formatDateToDDMMYYYY(date);
    const dateData = datesWithDataMap.get(ddmmyyyy);

    if (dateData) {
      return (
        <div className="flex justify-center mt-1">
          <span 
            className={`w-1.5 h-1.5 rounded-full ${dateData.isOnLeave ? 'bg-red-500' : 'bg-emerald-500'}`} 
          />
        </div>
      );
    }
    return null;
  };

  // Disable clicking on days that have no data
  const isTileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;
    const ddmmyyyy = formatDateToDDMMYYYY(date);
    return !datesWithDataMap.has(ddmmyyyy);
  };

  const handleDayClick = (value) => {
    const ddmmyyyy = formatDateToDDMMYYYY(value);
    if (onDateSelect && datesWithDataMap.has(ddmmyyyy)) {
      onDateSelect(ddmmyyyy);
    }
  };

  const recordedDates = Array.from(datesWithDataMap.keys())
    .map((value) => {
      const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return match
        ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
        : null;
    })
    .filter(Boolean);
  const minDate =
    recordedDates.length > 0
      ? new Date(Math.min(...recordedDates.map((date) => date.getTime())))
      : undefined;

  return (
    <div className={`h-full flex flex-col justify-between rounded-xl p-4 md:p-6 ${cardRing} ${surface} glass-panel custom-calendar-wrapper`}>
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <h2 className={`text-base font-bold m-0 ${textPrimary}`}>
          Submission History
        </h2>
      </div>

      {/* The Calendar */}
      <div className={`flex justify-center ${textPrimary}`}>
        <Calendar
          onChange={handleDayClick}
          value={now}
          minDate={minDate}
          maxDate={now}
          tileClassName={getTileClassName}
          tileContent={getTileContent}
          tileDisabled={isTileDisabled}
          prev2Label={null} 
          next2Label={null}
          formatShortWeekday={(locale, date) => date.toLocaleDateString(locale, { weekday: 'short' })}
        />
      </div>

      {/* Legend */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Logged Work
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> On Leave
        </span>
        <span className="flex items-center gap-1.5 opacity-50">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> No Data
        </span>
      </div>

      {/* CSS Overrides mapped to Tailwind's .dark class */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-calendar-wrapper .react-calendar {
          width: 100%;
          max-width: 420px; /* slightly widened to accommodate gaps nicely */
          background: transparent;
          border: none;
          font-family: inherit;
          color: inherit; 
        }
        
        /* -----------------------------------------
           GRID LAYOUT OVERRIDES (Fixes clumsiness)
           ----------------------------------------- */
        .custom-calendar-wrapper .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px; /* Spacing between date boxes */
        }

        .custom-calendar-wrapper .react-calendar__month-view__weekdays {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px; /* Match the gap of the days grid */
          margin-bottom: 8px; /* Breathing room under weekdays */
        }

        /* Ensure tiles shrink to fit grid constraints instead of flex percentages */
        .custom-calendar-wrapper .react-calendar__tile,
        .custom-calendar-wrapper .react-calendar__month-view__weekdays__weekday {
          width: 100% !important;
          max-width: 100% !important;
          flex: none !important;
        }

        /* -----------------------------------------
           STANDARD STYLES
           ----------------------------------------- */
        .custom-calendar-wrapper .react-calendar__navigation {
          margin-bottom: 1rem;
        }
        
        .custom-calendar-wrapper .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-weight: bold;
          font-size: 1rem;
          color: inherit; 
          border-radius: 0.5rem;
        }
        
        .custom-calendar-wrapper .react-calendar__navigation button:hover:enabled,
        .custom-calendar-wrapper .react-calendar__navigation button:focus:enabled {
          background-color: rgba(148, 163, 184, 0.15);
        }

        .custom-calendar-wrapper .react-calendar__month-view__weekdays__weekday {
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.75em;
          color: #64748b; /* slate-500 */
          text-decoration: none;
          text-align: center; /* keep header text centered */
        }

        .custom-calendar-wrapper .react-calendar__month-view__weekdays abbr {
          text-decoration: none;
        }

        .custom-calendar-wrapper .react-calendar__tile {
          padding: 0.75em 0.25em; /* Reduced horizontal padding to fit safely in grid */
          background: none;
          text-align: center;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          color: inherit;
          transition: all 0.2s ease-in-out;
          box-sizing: border-box; /* Prevent borders from stretching boxes */
        }

        .custom-calendar-wrapper .react-calendar__tile:disabled {
          opacity: 0.3;
          background-color: transparent !important;
        }

        /* Hover state for clickable tiles */
        .custom-calendar-wrapper .react-calendar__tile:not(:disabled):hover {
          background-color: rgba(148, 163, 184, 0.15);
        }

        /* Logged Work Tile */
        .custom-calendar-wrapper .react-calendar__tile--logged {
          background-color: rgba(16, 185, 129, 0.1);
          color: #059669; /* emerald-600 */
          font-weight: 700;
        }
        
        /* Leave Tile */
        .custom-calendar-wrapper .react-calendar__tile--leave {
          background-color: rgba(239, 68, 68, 0.1);
          color: #dc2626; /* red-600 */
          font-weight: 700;
        }

        /* Today Tile */
        .custom-calendar-wrapper .react-calendar__tile--now {
          border: 2px solid #3b82f6; /* blue-500 */
        }

        /* Active/Selected Tile */
        .custom-calendar-wrapper .react-calendar__tile--active,
        .custom-calendar-wrapper .react-calendar__tile--active:enabled:hover,
        .custom-calendar-wrapper .react-calendar__tile--active:enabled:focus {
          background: #3b82f6 !important;
          color: white !important;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5);
        }
        
        /* Keep dots visible when selected */
        .custom-calendar-wrapper .react-calendar__tile--active span.bg-emerald-500,
        .custom-calendar-wrapper .react-calendar__tile--active span.bg-red-500 {
          background-color: white;
        }

        /* 🌙 DARK MODE OVERRIDES */
        .dark .custom-calendar-wrapper .react-calendar__month-view__weekdays__weekday {
          color: #94a3b8; /* slate-400 */
        }

        .dark .custom-calendar-wrapper .react-calendar__navigation button:hover:enabled,
        .dark .custom-calendar-wrapper .react-calendar__navigation button:focus:enabled,
        .dark .custom-calendar-wrapper .react-calendar__tile:not(:disabled):hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .dark .custom-calendar-wrapper .react-calendar__tile--logged {
          color: #34d399; /* emerald-400 */
          background-color: rgba(16, 185, 129, 0.15);
        }

        .dark .custom-calendar-wrapper .react-calendar__tile--leave {
          color: #f87171; /* red-400 */
          background-color: rgba(239, 68, 68, 0.15);
        }
        
        /* Fix neighboring month days fading correctly in dark mode */
        .dark .custom-calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
          color: #475569; /* slate-600 */
        }
      `}} />
    </div>
  );
};

export default SubmissionCalendar;
