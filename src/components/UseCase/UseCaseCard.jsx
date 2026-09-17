export default function UseCaseCard({
  data,
  agent,
  onClick,
  isAdmin = false,
  onApprove = () => {},
  onDecline = () => {},
  onRework = () => {}   // ✅ NEW
}) {
  const useCase = data || agent;
  if (!useCase) return null;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white dark:bg-gray-800
                 rounded-xl p-5 shadow hover:shadow-lg transition"
    >
      <h3 className="font-semibold text-lg">
        {useCase.title}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
        {useCase.problemDescription}
      </p>

      <p className="text-xs text-gray-500 mt-3">
        Category: <strong>{useCase.category}</strong>
      </p>

      <p className="text-xs text-gray-500">
        Submitted by: <strong>{useCase.submittedBy}</strong>
      </p>

      {isAdmin && (
        <div className="mt-4 flex justify-end gap-3">
          {/* Decline */}
          <button
            onClick={e => {
              e.stopPropagation();
              onDecline(useCase); // ✅ OPEN MODAL
            }}
            className="px-3 py-1 text-sm rounded bg-red-100 text-red-700"
          >
            ❌ Decline
          </button>

          {/* ✅ NEW: Rework */}
          <button
            onClick={e => {
              e.stopPropagation();
              onRework(useCase); // ✅ OPEN MODAL
            }}
            className="px-3 py-1 text-sm rounded bg-orange-100 text-orange-700"
          >
            🟧 Rework
          </button>

          {/* Approve */}
          <button
            onClick={e => {
              e.stopPropagation();
              onApprove(useCase.id);
            }}
            className="px-3 py-1 text-sm rounded bg-green-100 text-green-700"
          >
            ✅ Approve
          </button>
        </div>
      )}
    </div>
  );
}