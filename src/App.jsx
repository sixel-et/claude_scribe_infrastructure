import { useState, useCallback } from 'react';
import { useGitHub } from './hooks/useGitHub';
import { useDocument } from './hooks/useDocument';
import { AuthInput } from './components/AuthInput';
import { DocPicker } from './components/DocPicker';
import { Editor } from './components/Editor';
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
                onClick={() => setShowComments(!showComments)}
                className={`text-sm px-2 py-1 rounded ${showComments ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                💬 {commentCount > 0 && <span className="ml-1">{commentCount}</span>}
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
            onSelect={setCurrentDoc}
            onCreateDoc={handleCreateDoc}
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
                      <div className="flex-1 overflow-hidden">
                        <Editor
                          content={content}
                          meta={meta}
                          onChange={updateContent}
                          onAcceptEdit={acceptEdit}
                          onRejectEdit={rejectEdit}
                          onSelectionChange={setSelectedText}
                          disabled={isSaving}
                        />
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
