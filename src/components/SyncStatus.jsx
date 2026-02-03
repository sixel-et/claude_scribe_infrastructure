export function SyncStatus({ isSaving, isDirty, error }) {
  if (error) {
    return (
      <span className="text-red-400 text-sm">
        Error: {error}
      </span>
    );
  }

  if (isSaving) {
    return (
      <span className="text-yellow-400 text-sm">
        Saving...
      </span>
    );
  }

  if (isDirty) {
    return (
      <span className="text-yellow-400 text-sm">
        Unsaved changes
      </span>
    );
  }

  return (
    <span className="text-green-400 text-sm">
      Saved
    </span>
  );
}
