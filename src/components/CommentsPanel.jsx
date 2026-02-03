import { useState } from 'react';

export function CommentsPanel({ comments, onAddComment, onResolveComment, selectedText }) {
  const [newCommentText, setNewCommentText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const unresolvedComments = (comments || []).filter(c => !c.resolved);
  const resolvedComments = (comments || []).filter(c => c.resolved);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newCommentText.trim() && selectedText) {
      onAddComment(selectedText, newCommentText.trim());
      setNewCommentText('');
      setIsAdding(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 border-l border-gray-700">
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-white">Comments</h2>
      </div>

      {/* Add comment form */}
      <div className="p-3 border-b border-gray-700">
        {selectedText ? (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">
              Selected: <span className="text-gray-300 italic">"{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}"</span>
            </div>
            {isAdding ? (
              <form onSubmit={handleSubmit} className="space-y-2">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write your comment..."
                  className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="flex-1 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); setNewCommentText(''); }}
                    className="flex-1 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add Comment
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            Select text in the editor to add a comment
          </div>
        )}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {unresolvedComments.length === 0 && resolvedComments.length === 0 ? (
          <div className="text-sm text-gray-500">No comments yet</div>
        ) : (
          <>
            {unresolvedComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onResolve={() => onResolveComment(comment.id)}
              />
            ))}

            {resolvedComments.length > 0 && (
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                  {resolvedComments.length} resolved comment{resolvedComments.length > 1 ? 's' : ''}
                </summary>
                <div className="mt-2 space-y-2 opacity-60">
                  {resolvedComments.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      resolved
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CommentCard({ comment, onResolve, resolved }) {
  const isHuman = comment.author === 'human';

  return (
    <div className={`p-2 rounded text-sm ${resolved ? 'bg-gray-700/50' : 'bg-gray-700'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${isHuman ? 'text-blue-400' : 'text-purple-400'}`}>
          {isHuman ? 'You' : comment.author || 'Claude'}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(comment.created).toLocaleDateString()}
        </span>
      </div>

      <div className="text-xs text-gray-400 italic mb-1 truncate" title={comment.anchor}>
        on: "{comment.anchor?.slice(0, 40)}{comment.anchor?.length > 40 ? '...' : ''}"
      </div>

      <div className="text-gray-200">{comment.text}</div>

      {!resolved && onResolve && (
        <button
          onClick={onResolve}
          className="mt-2 text-xs text-gray-400 hover:text-white"
        >
          ✓ Resolve
        </button>
      )}
    </div>
  );
}
