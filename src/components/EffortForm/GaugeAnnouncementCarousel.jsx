import React, { useEffect, useState, useMemo } from "react";

function getOrdinal(day) {
  if (day > 3 && day < 21) return `${day}th`;
 
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}
 
function getSubmissionDeadlineAnnouncement() {
  const today = new Date();
 
  const day = today.getDate();
  const year = today.getFullYear();
 
  const currentMonth = today.toLocaleString("en-US", {
    month: "long",
  });
 
  const nextMonthDate = new Date(year, today.getMonth() + 1, 1);
 
  const nextMonth = nextMonthDate.toLocaleString("en-US", {
    month: "long",
  });
 
  const nextMonthYear = nextMonthDate.getFullYear();
 
  if (day <= 17) {
    return {
      title: `Submission Deadline - 17th ${currentMonth} ${year}`,
      message: `1st-15th ${currentMonth} ${year} entries can be added, updated, or deleted only until this date.`,
    };
  }
 
  const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
 
  return {
    title: `Submission Deadline - 2nd ${nextMonth} ${nextMonthYear}`,
    message: `16th-${getOrdinal(lastDay)} ${currentMonth} ${year} entries can be added, updated, or deleted only until this date.`,
  };
}

function getAnnouncements() {
  return [
    getSubmissionDeadlineAnnouncement(),
    {
      title: "First-Half Month Cutoff",
      message:
        "Entries for dates 1st-15th of the month can be submitted or modified until the 18th of the same month. After the 18th, submissions and changes for any date between 1st-15th are locked.",
    },
    {
      title: "Previous Month Cutoff",
      message:
        "Previous-month entries are editable only until the 2nd day of the current month and locked from the 3rd day onward.",
    },
  ];
}
 
export default function GaugeAnnouncementCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());
  
  // Recalculate announcements when the date changes
  const ANNOUNCEMENTS = useMemo(() => getAnnouncements(), [currentDate]);

  // Check for date change every minute
  useEffect(() => {
    const checkDateChange = () => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
        setActiveIndex(0); // Reset to first announcement on date change
      }
    };
    
    const dateCheckInterval = setInterval(checkDateChange, 60000); // Check every minute
    return () => clearInterval(dateCheckInterval);
  }, [currentDate]);
 
  useEffect(() => {
    if (paused) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % ANNOUNCEMENTS.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [paused, ANNOUNCEMENTS.length]);
 
  const move = (offset) => {
    setActiveIndex(
      (index) =>
        (index + offset + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length,
    );
  };
  const announcement = ANNOUNCEMENTS[activeIndex];
 
  return (
  <section
    className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/30"
    aria-roledescription="carousel"
    aria-label="Gauge submission announcements"
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)}
    onBlurCapture={() => setPaused(false)}
  >
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Important Gauge rule
        </p>
        <h2 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
          {announcement.title}
        </h2>
        <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-300">
          {announcement.message}
        </p>
      </div>
    </div>
 
    <div className="mt-3 flex items-center justify-between">
      <div
        className="flex gap-1.5"
        aria-label="Announcement selection"
      >
        {ANNOUNCEMENTS.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === activeIndex
                ? "w-6 bg-amber-600 dark:bg-amber-400"
                : "w-2 bg-amber-300 dark:bg-amber-800"
            }`}
            aria-label={`Show announcement ${index + 1}`}
            aria-current={index === activeIndex}
          />
        ))}
      </div>
 
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => move(-1)}
          className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200"
          aria-label="Previous announcement"
        >
          Prev
        </button>
 
        <button
          type="button"
          onClick={() => move(1)}
          className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200"
          aria-label="Next announcement"
        >
          Next
        </button>
      </div>
    </div>
  </section>
  );
}