import { navigate } from "../../router/miniRouter";

export default function WelcomeCard({
  title,
  description,
  to,
  icon = null,
  disabled = false,
  badge, // e.g., "New", "Beta"
}) {
  const handleClick = (e) => {
    if (disabled) return;
    e.preventDefault();
    navigate(to);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      aria-disabled={disabled}
      className={[
        "group relative w-full rounded-xl p-[1px] overflow-hidden text-left", // Reduced border thickness and radius
        "transition-all duration-500 outline-none",
        disabled 
          ? "opacity-50 cursor-not-allowed grayscale" 
          : "cursor-pointer hover:-translate-y-1 hover:shadow-lg",
        "focus:ring-2 focus:ring-blue-500",
        "bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900",
        !disabled && "hover:from-blue-500 hover:to-indigo-500 dark:hover:from-cyan-400 dark:hover:to-purple-500"
      ].join(" ")}
    >
      {/* Inner Container - Reduced padding to p-3 */}
      <div className="relative h-full w-full flex flex-col justify-between p-3 rounded-[11px] bg-white/80 dark:bg-[#0a0f1c]/80 backdrop-blur-xl transition-colors duration-500 group-hover:bg-white/95 dark:group-hover:bg-[#0a0f1c]/90">
        
        {badge && (
          <span className="absolute right-2 top-2 z-10 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-tight uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-cyan-400 dark:border-cyan-400/30">
            {badge}
          </span>
        )}

        <div>
          {/* Smaller Glowing Icon Container */}
          <div
            className={[
              "flex h-8 w-8 items-center justify-center rounded-lg border shadow-inner mb-2 transition-all duration-500", // Shrank from mb-4 to mb-2
              "bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 border-blue-100",
              "dark:from-gray-800 dark:to-gray-900 dark:text-cyan-400 dark:border-gray-700",
              !disabled && "group-hover:scale-105 group-hover:text-white dark:group-hover:text-gray-900"
            ].join(" ")}
            aria-hidden="true"
          >
            {/* Scaling the icon down to fit the smaller box */}
            <div className="scale-75">
              {icon ?? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
                </svg>
              )}
            </div>
          </div>

          <div>
            {/* Reduced title and description size */}
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 transition-all duration-300 group-hover:text-blue-600 dark:group-hover:text-cyan-300">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400 leading-tight line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Action Sequence Arrow - Tightened margin */}
        {!disabled && (
          <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-cyan-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            Initialize
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l5 5a.997.997 0 01.083 1.32l-.083.094-5 5a1 1 0 01-1.497-1.32l.083-.094L13.585 10H4a1 1 0 01-.117-1.993L4 8h9.585l-3.292-3.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}