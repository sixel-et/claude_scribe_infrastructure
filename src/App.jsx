import { useState, useCallback, useRef, useEffect } from 'react';
import { useGitHub } from './hooks/useGitHub';
import { useDocument } from './hooks/useDocument';
import { AuthInput } from './components/AuthInput';
import { DocPicker } from './components/DocPicker';
import { Editor } from './components/Editor';
import { MarkdownPreview } from './components/MarkdownPreview';
import { SyncStatus } from './components/SyncStatus';
import { CommentsPanel } from './components/CommentsPanel';
import { StaleEditsPanel } from './components/StaleEditsPanel';
import * as github from './lib/github';
import './index.css';

function App() {
  const { isConnected, isLoading: isConnecting, error: connectError, repoInfo, connect, disconnect } = useGitHub();
  const [currentDoc, setCurrentDoc] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [showComments, setShowComments] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  const {
    content,
    meta,
    isLoading: isDocLoading,
    isSaving,
    isDirty,
    error: docError,
    updateContent,
    acceptEdit,
    rejectEdit,
    addComment,
    resolveComment,
    reload
  } = useDocument(currentDoc);

  const handleNavigateToSource = useCallback((startPos, endPos) => {
    if (editorRef.current) {
      editorRef.current.setSelection(startPos, endPos);
    }
  }, []);

  const handleTocNavigate = useCallback((offset) => {
    if (editorRef.current) {
      editorRef.current.setCursor(offset);
    }
    if (previewRef.current) {
      previewRef.current.scrollToPosition(offset);
    }
  }, []);

  const handleNavigateToAnchor = useCallback((anchorText) => {
    if (!content || !anchorText) return;

    const index = content.indexOf(anchorText);
    if (index !== -1) {
      if (editorRef.current) {
        editorRef.current.setSelection(index, index + anchorText.length);
      }
      if (previewRef.current) {
        previewRef.current.scrollToPosition(index);
      }
    }
  }, [content]);

  // Auto-refocus editor on keypress when document is open
  useEffect(() => {
    if (!currentDoc) return;

    const handleKeyDown = (e) => {
      // Skip if already focused on editor, or in an input/textarea
      if (editorRef.current?.hasFocus()) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.target.isContentEditable) return;

      // Skip modifier-only keys
      if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') return;

      // For printable characters or space, refocus editor and let it handle the key
      const isPrintable = e.key.length === 1;
      const isSpace = e.key === ' ';
      const isBackspace = e.key === 'Backspace';
      const isDelete = e.key === 'Delete';
      const isEnter = e.key === 'Enter';
      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);

      if (isPrintable || isSpace || isBackspace || isDelete || isEnter || isArrow) {
        e.preventDefault();
        e.stopPropagation();

        if (editorRef.current) {
          editorRef.current.focus();

          // For printable characters, insert them
          if (isPrintable || isSpace) {
            // Small delay to ensure focus, then simulate the keypress
            setTimeout(() => {
              if (editorRef.current?.hasFocus()) {
                document.execCommand('insertText', false, e.key);
              }
            }, 0);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [currentDoc]);

  const handleCreateDoc = useCallback(async (path) => {
    try {
      // Create empty markdown file
      const mdPath = `docs/${path}`;
      await github.putFile(mdPath, '', `[editor] Create document: ${path}`);

      // Create empty meta file
      const metaPath = `meta/${path.replace(/\.md$/, '.json')}`;
      const emptyMeta = JSON.stringify({ pending_edits: [], comments: [] }, null, 2);
      await github.putFile(metaPath, emptyMeta, `[editor] Create meta: ${path}`);

      // Select the new document
      setCurrentDoc(path);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  }, []);

  if (!isConnected) {
    return (
      <AuthInput
        onConnect={connect}
        error={connectError}
        isLoading={isConnecting}
      />
    );
  }

  const commentCount = (meta?.comments || []).filter(c => !c.resolved).length;
  const suggestionCount = (meta?.pending_edits || []).length;

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">Claude Scribe</h1>
          <span className="text-sm text-gray-400">
            {repoInfo?.owner}/{repoInfo?.repo}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {currentDoc && (
            <>
              <SyncStatus
                isSaving={isSaving}
                isDirty={isDirty}
                error={docError}
              />
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`text-sm px-2 py-1 rounded ${showPreview ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Toggle preview (click preview to jump to source)"
              >
                Preview
              </button>
              <button
                onClick={() => setShowComments(!showComments)}
                className={`text-sm px-2 py-1 rounded ${showComments ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Comments {commentCount > 0 && <span className="ml-1">{commentCount}</span>}
              </button>
            </>
          )}
          <button
            onClick={disconnect}
            className="text-sm text-gray-400 hover:text-white"
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 flex-shrink-0">
          <DocPicker
            currentDoc={currentDoc}
            currentDocContent={content}
            onSelect={setCurrentDoc}
            onCreateDoc={handleCreateDoc}
            onNavigateToHeader={handleTocNavigate}
          />
        </aside>

        {/* Editor area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {currentDoc ? (
            <>
              <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-300">{currentDoc}</span>
                <div className="flex items-center gap-3">
                  {suggestionCount > 0 && (
                    <span className="text-xs text-blue-400">
                      {suggestionCount} suggestion{suggestionCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                  {isDocLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      Loading...
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-hidden flex">
                        <div className={`overflow-hidden ${showPreview ? 'w-1/2 border-r border-gray-700' : 'w-full'}`}>
                          <Editor
                            ref={editorRef}
                            content={content}
                            meta={meta}
                            onChange={updateContent}
                            onAcceptEdit={acceptEdit}
                            onRejectEdit={rejectEdit}
                            onSelectionChange={setSelectedText}
                            disabled={isSaving}
                          />
                        </div>
                        {showPreview && (
                          <div className="w-1/2 overflow-hidden">
                            <MarkdownPreview
                              ref={previewRef}
                              content={content}
                              onNavigateToSource={handleNavigateToSource}
                            />
                          </div>
                        )}
                      </div>
                      <StaleEditsPanel
                        content={content}
                        pendingEdits={meta?.pending_edits}
                        onDismiss={rejectEdit}
                      />
                    </>
                  )}
                </div>

                {/* Comments panel */}
                {showComments && (
                  <div className="w-72 flex-shrink-0">
                    <CommentsPanel
                      comments={meta?.comments}
                      selectedText={selectedText}
                      onAddComment={addComment}
                      onResolveComment={resolveComment}
                      onNavigateToAnchor={handleNavigateToAnchor}
                      content={content}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a document or create a new one
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
