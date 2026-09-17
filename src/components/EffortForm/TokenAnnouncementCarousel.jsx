import React, { useEffect, useState } from "react";
import { getTokenSubmissionWindow } from "../../data/UtilsEffortform";

function getTokenAnnouncements() {
  const windowInfo = getTokenSubmissionWindow();
  const { formattedDates } = windowInfo;
  
  return [
    {
      title: "🎉 New Feature: AI Token Usage Tracking",
      message:
        "Track your GenAI tool usage and view analytics! Submit your monthly token consumption."
    },
    {
      title: "AI Token Usage Submission Window",
      message:
        `You can submit token usage from ${formattedDates.windowStart} to ${formattedDates.windowEnd} for ${formattedDates.targetMonthName} ${formattedDates.targetYear} data. Re-submitting for the same month updates your existing entry.`,
    },
    {
      title: "📊 View Your Token Analytics",
      message:
        'Click "Submit Token Usage" button above to enter your data.',
    },
  ];
}

export default function TokenAnnouncementCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  
  const ANNOUNCEMENTS = getTokenAnnouncements();

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
      className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 shadow-sm dark:border-purple-800/60 dark:bg-purple-950/30"
      aria-roledescription="carousel"
      aria-label="Token usage feature announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
            AI Token Usage Feature
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
        <div className="flex gap-1.5" aria-label="Announcement selection">
          {ANNOUNCEMENTS.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-6 bg-purple-600 dark:bg-purple-400"
                  : "w-2 bg-purple-300 dark:bg-purple-800"
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
            className="rounded-md border border-purple-300 bg-white px-2 py-1 text-xs font-bold text-purple-800 hover:bg-purple-100 dark:border-purple-700 dark:bg-slate-900 dark:text-purple-200"
            aria-label="Previous announcement"
          >
            Prev
          </button>

          <button
            type="button"
            onClick={() => move(1)}
            className="rounded-md border border-purple-300 bg-white px-2 py-1 text-xs font-bold text-purple-800 hover:bg-purple-100 dark:border-purple-700 dark:bg-slate-900 dark:text-purple-200"
            aria-label="Next announcement"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
