import { useEffect, useRef, useCallback } from 'react';
import { EditorState, Compartment, StateField, StateEffect } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, Decoration, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { findEditPosition } from '../lib/suggestions';

// Compartment for dynamic editable configuration
const editableCompartment = new Compartment();

// Effect to update suggestions
const setSuggestions = StateEffect.define();

// Widget for accept/reject buttons
class SuggestionButtonsWidget extends WidgetType {
  constructor(edit, onAccept, onReject) {
    super();
    this.edit = edit;
    this.onAccept = onAccept;
    this.onReject = onReject;
  }

  toDOM() {
    const container = document.createElement('span');
    container.className = 'suggestion-buttons';
    container.style.cssText = 'margin-left: 8px; display: inline-flex; gap: 4px; align-items: center;';

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept';
    acceptBtn.title = this.edit.rationale || 'Accept suggestion';
    acceptBtn.style.cssText = 'padding: 2px 8px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
    acceptBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onAccept(this.edit);
    };

    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Reject';
    rejectBtn.title = 'Reject suggestion';
    rejectBtn.style.cssText = 'padding: 2px 8px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
    rejectBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onReject(this.edit);
    };

    container.appendChild(acceptBtn);
    container.appendChild(rejectBtn);

    if (this.edit.rationale) {
      const rationale = document.createElement('span');
      rationale.textContent = this.edit.rationale;
      rationale.style.cssText = 'color: #9ca3af; font-style: italic; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      rationale.title = this.edit.rationale;
      container.appendChild(rationale);
    }

    return container;
  }

  ignoreEvent() {
    return false;
  }
}

// Create the suggestions state field
function createSuggestionsField(onAccept, onReject) {
  return StateField.define({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setSuggestions)) {
          const { content, pendingEdits } = effect.value;
          const decos = [];

          for (const edit of pendingEdits) {
            const pos = findEditPosition(content, edit);

            if (!pos.found) {
              // Stale or ambiguous - skip for now
              continue;
            }

            if (edit.type === 'replace') {
              // Strikethrough the original text
              decos.push(
                Decoration.mark({
                  class: 'suggestion-delete',
                  attributes: { style: 'text-decoration: line-through; color: #ef4444; background: rgba(239, 68, 68, 0.1);' }
                }).range(pos.from, pos.to)
              );

              // Add the replacement text as a widget after
              decos.push(
                Decoration.widget({
                  widget: new ReplacementTextWidget(edit.replace),
                  side: 1,
                }).range(pos.to)
              );

              // Add buttons at the end
              decos.push(
                Decoration.widget({
                  widget: new SuggestionButtonsWidget(edit, onAccept, onReject),
                  side: 1,
                }).range(pos.to)
              );
            } else if (edit.type === 'insert_after') {
              // Show inserted text
              decos.push(
                Decoration.widget({
                  widget: new InsertedTextWidget(edit.insert),
                  side: 1,
                }).range(pos.to)
              );

              // Add buttons
              decos.push(
                Decoration.widget({
                  widget: new SuggestionButtonsWidget(edit, onAccept, onReject),
                  side: 1,
                }).range(pos.to)
              );
            } else if (edit.type === 'delete') {
              // Highlight text to be deleted
              decos.push(
                Decoration.mark({
                  class: 'suggestion-delete',
                  attributes: { style: 'text-decoration: line-through; color: #ef4444; background: rgba(239, 68, 68, 0.2);' }
                }).range(pos.from, pos.to)
              );

              // Add buttons
              decos.push(
                Decoration.widget({
                  widget: new SuggestionButtonsWidget(edit, onAccept, onReject),
                  side: 1,
                }).range(pos.to)
              );
            }
          }

          return Decoration.set(decos, true);
        }
      }
      return decorations.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f),
  });
}

// Widget to show replacement text
class ReplacementTextWidget extends WidgetType {
  constructor(text) {
    super();
    this.text = text;
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.text;
    span.style.cssText = 'color: #22c55e; background: rgba(34, 197, 94, 0.1); padding: 0 2px;';
    return span;
  }
}

// Widget to show inserted text
class InsertedTextWidget extends WidgetType {
  constructor(text) {
    super();
    this.text = text;
  }

  toDOM() {
    const span = document.createElement('span');
    span.textContent = this.text;
    span.style.cssText = 'color: #22c55e; background: rgba(34, 197, 94, 0.15); padding: 0 2px; border-left: 2px solid #22c55e;';
    return span;
  }
}

export function Editor({ content, meta, onChange, onAcceptEdit, onRejectEdit, onSelectionChange, disabled }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const suggestionsFieldRef = useRef(null);
  onChangeRef.current = onChange;
  onSelectionChangeRef.current = onSelectionChange;

  const handleAccept = useCallback((edit) => {
    if (onAcceptEdit) onAcceptEdit(edit);
  }, [onAcceptEdit]);

  const handleReject = useCallback((edit) => {
    if (onRejectEdit) onRejectEdit(edit);
  }, [onRejectEdit]);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
      if (update.selectionSet && onSelectionChangeRef.current) {
        const { from, to } = update.state.selection.main;
        if (from !== to) {
          const selectedText = update.state.doc.sliceString(from, to);
          onSelectionChangeRef.current(selectedText);
        } else {
          onSelectionChangeRef.current('');
        }
      }
    });

    // Create the suggestions field with callbacks
    suggestionsFieldRef.current = createSuggestionsField(handleAccept, handleReject);

    const state = EditorState.create({
      doc: content || '',
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        updateListener,
        suggestionsFieldRef.current,
        editableCompartment.of(EditorView.editable.of(!disabled)),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            overflow: 'auto',
          },
          '.cm-content': {
            padding: '16px',
            maxWidth: '80ch',
          },
          '.cm-line': {
            padding: '0 4px',
          },
          '&.cm-focused': {
            outline: 'none',
          },
        }),
        EditorView.baseTheme({
          '&.cm-editor': {
            backgroundColor: '#1f2937',
          },
          '.cm-gutters': {
            backgroundColor: '#111827',
            color: '#6b7280',
            border: 'none',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#1f2937',
          },
          '.cm-activeLine': {
            backgroundColor: '#374151',
          },
          '.cm-content': {
            color: '#f3f4f6',
          },
          '.cm-cursor': {
            borderLeftColor: '#f3f4f6',
          },
          '.cm-selectionBackground': {
            backgroundColor: '#4b5563 !important',
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [handleAccept, handleReject]);

  // Update content from external source
  useEffect(() => {
    if (viewRef.current && content !== undefined) {
      const currentContent = viewRef.current.state.doc.toString();
      if (content !== currentContent) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        });
      }
    }
  }, [content]);

  // Update suggestions when meta changes
  useEffect(() => {
    if (viewRef.current && meta && content !== undefined) {
      viewRef.current.dispatch({
        effects: setSuggestions.of({
          content,
          pendingEdits: meta.pending_edits || [],
        }),
      });
    }
  }, [meta, content]);

  // Update editable state
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
      });
    }
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
    />
  );
}
