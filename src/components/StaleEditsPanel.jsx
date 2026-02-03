import { findEditPosition } from '../lib/suggestions';

export function StaleEditsPanel({ content, pendingEdits, onDismiss }) {
  // Find edits that can't be applied
  const staleEdits = (pendingEdits || []).filter(edit => {
    const pos = findEditPosition(content, edit);
    return !pos.found;
  });

  if (staleEdits.length === 0) return null;

  return (
    <div className="bg-yellow-900/30 border-t border-yellow-700/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-yellow-400">
          {staleEdits.length} stale suggestion{staleEdits.length > 1 ? 's' : ''}
        </span>
        <span className="text-xs text-yellow-500">
          Target text was changed
        </span>
      </div>

      <div className="space-y-2">
        {staleEdits.map(edit => (
          <div key={edit.id} className="bg-gray-800 rounded p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 mb-1">
                  Looking for: <span className="text-red-400 italic">"{edit.find.slice(0, 50)}{edit.find.length > 50 ? '...' : ''}"</span>
                </div>

                {edit.type === 'replace' && (
                  <div className="text-xs text-gray-500">
                    Replace with: <span className="text-green-400">"{edit.replace.slice(0, 50)}{edit.replace.length > 50 ? '...' : ''}"</span>
                  </div>
                )}

                {edit.type === 'insert_after' && (
                  <div className="text-xs text-gray-500">
                    Insert: <span className="text-green-400">"{edit.insert.slice(0, 50)}{edit.insert.length > 50 ? '...' : ''}"</span>
                  </div>
                )}

                {edit.type === 'delete' && (
                  <div className="text-xs text-gray-500">
                    Action: <span className="text-red-400">Delete</span>
                  </div>
                )}

                {edit.rationale && (
                  <div className="text-xs text-gray-400 mt-1 italic">
                    {edit.rationale}
                  </div>
                )}
              </div>

              <button
                onClick={() => onDismiss(edit)}
                className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
