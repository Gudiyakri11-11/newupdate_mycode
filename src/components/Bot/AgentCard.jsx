export default function AgentCard({
  agent,
  onClick,
  isAdmin = false,
  onApprove = () => {},
  onDecline = () => {},
  onRework = () => {}   // ✅ NEW
}) {
  if (!agent) return null;

  const statusStyles = {
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    DECLINED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    REWORK: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" // ✅ NEW
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white dark:bg-gray-800
                 rounded-xl p-5 shadow hover:shadow-lg transition"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">
          {agent.name || "Unnamed Bot"}
        </h3>

        <span
          className={`text-xs px-2 py-1 rounded ${
            statusStyles[agent.status] || "bg-gray-200 text-gray-800"
          }`}
        >
          {agent.status}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
        {agent.description || "No description provided"}
      </p>

      <p className="text-xs text-gray-500 mt-3">
        Category: <strong>{agent.category || "N/A"}</strong>
      </p>

      {isAdmin && (
        <div className="mt-4 flex justify-end gap-3">
          {/* 🔁 REWORK */}
          <button
            onClick={e => {
              e.stopPropagation();
              onRework(agent);
            }}
            className="px-3 py-1 rounded text-sm
                       bg-orange-100 dark:bg-orange-900
                       text-orange-700 dark:text-orange-300"
          >
            🔁 Rework
          </button>

          {/* ❌ DECLINE */}
          <button
            onClick={e => {
              e.stopPropagation();
              onDecline(agent);
            }}
            className="px-3 py-1 rounded text-sm
                       bg-red-100 dark:bg-red-900
                       text-red-700 dark:text-red-300"
          >
            ❌ Decline
          </button>

          {/* ✅ APPROVE */}
          <button
            onClick={e => {
              e.stopPropagation();
              onApprove(agent.id);
            }}
            className="px-3 py-1 rounded text-sm
                       bg-green-100 dark:bg-green-900
                       text-green-700 dark:text-green-300"
          >
            ✅ Approve
          </button>
        </div>
      )}
    </div>
  );
}