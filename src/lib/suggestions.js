// Find the position of an edit's target text in the document
export function findEditPosition(content, edit) {
  const findText = edit.find;
  const index = content.indexOf(findText);

  if (index === -1) {
    return { found: false, stale: true };
  }

  // Check for ambiguity (multiple matches)
  const secondIndex = content.indexOf(findText, index + 1);
  if (secondIndex !== -1) {
    return { found: false, ambiguous: true };
  }

  return {
    found: true,
    from: index,
    to: index + findText.length,
  };
}

// Apply an edit to the document content
export function applyEdit(content, edit) {
  const position = findEditPosition(content, edit);

  if (!position.found) {
    throw new Error(position.stale ? 'Edit is stale' : 'Edit is ambiguous');
  }

  switch (edit.type) {
    case 'replace':
      return (
        content.slice(0, position.from) +
        edit.replace +
        content.slice(position.to)
      );

    case 'insert_after':
      return (
        content.slice(0, position.to) +
        edit.insert +
        content.slice(position.to)
      );

    case 'delete':
      return (
        content.slice(0, position.from) +
        content.slice(position.to)
      );

    default:
      throw new Error(`Unknown edit type: ${edit.type}`);
  }
}

// Remove an edit from the meta object
export function removeEdit(meta, editId) {
  return {
    ...meta,
    pending_edits: meta.pending_edits.filter(e => e.id !== editId),
  };
}

// Get all edit positions for rendering
export function getEditPositions(content, pendingEdits) {
  return pendingEdits.map(edit => {
    const position = findEditPosition(content, edit);
    return {
      edit,
      ...position,
    };
  });
}
