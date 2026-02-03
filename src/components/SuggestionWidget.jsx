import { createRoot } from 'react-dom/client';

// Creates a DOM element with React content for CodeMirror widgets
export function createSuggestionWidget(edit, onAccept, onReject) {
  const container = document.createElement('span');
  container.className = 'suggestion-widget';

  const root = createRoot(container);
  root.render(
    <SuggestionButtons
      edit={edit}
      onAccept={() => onAccept(edit)}
      onReject={() => onReject(edit)}
    />
  );

  // Store root for cleanup
  container._reactRoot = root;

  return container;
}

function SuggestionButtons({ edit, onAccept, onReject }) {
  return (
    <span className="inline-flex items-center gap-1 ml-2 text-xs">
      <button
        onClick={onAccept}
        className="px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700"
        title={edit.rationale || 'Accept suggestion'}
      >
        ✓
      </button>
      <button
        onClick={onReject}
        className="px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
        title="Reject suggestion"
      >
        ✗
      </button>
      {edit.rationale && (
        <span className="text-gray-400 italic max-w-xs truncate" title={edit.rationale}>
          {edit.rationale}
        </span>
      )}
    </span>
  );
}

// Cleanup function for when widgets are removed
export function cleanupWidget(element) {
  if (element._reactRoot) {
    element._reactRoot.unmount();
  }
}
