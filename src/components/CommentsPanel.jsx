import { useState, useMemo, useRef } from 'react';

export function CommentsPanel({ comments, onAddComment, onResolveComment, selectedText, onNavigateToAnchor, content }) {
  const [newCommentText, setNewCommentText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Cache for comment positions - only recalculate when content changes significantly
  const positionCacheRef = useRef({ content: null, positions: new Map() });

  // Get cached position for a comment anchor
  const getPosition = (anchor) => {
    if (!content || !anchor) return Infinity;

    // Rebuild cache if content changed significantly
    const cache = positionCacheRef.current;
    if (cache.content !== content) {
      // Only rebuild if length changed significantly (avoid recalc on small edits)
      const lengthDiff = Math.abs((content?.length || 0) - (cache.content?.length || 0));
      if (!cache.content || lengthDiff > 100) {
        cache.content = content;
        cache.positions = new Map();
      }
    }

    // Return cached position or calculate and cache
    if (!cache.positions.has(anchor)) {
      const pos = content.indexOf(anchor);
      cache.positions.set(anchor, pos === -1 ? Infinity : pos);
    }
    return cache.positions.get(anchor);
  };

  // Organize comments into threads, sorted by document position
  const { rootComments, repliesByParent, unresolvedCount } = useMemo(() => {
    const allComments = comments || [];
    const roots = allComments.filter(c => !c.parentId && !c.resolved);
    const resolved = allComments.filter(c => !c.parentId && c.resolved);
    const replies = {};

    for (const comment of allComments) {
      if (comment.parentId) {
        if (!replies[comment.parentId]) {
          replies[comment.parentId] = [];
        }
        replies[comment.parentId].push(comment);
      }
    }

    // Sort replies by date
    for (const parentId of Object.keys(replies)) {
      replies[parentId].sort((a, b) => new Date(a.created) - new Date(b.created));
    }

    // Sort root comments by cached position
    roots.sort((a, b) => getPosition(a.anchor) - getPosition(b.anchor));
    resolved.sort((a, b) => getPosition(a.anchor) - getPosition(b.anchor));

    return {
      rootComments: [...roots, ...resolved],
      repliesByParent: replies,
      unresolvedCount: roots.length,
    };
  }, [comments, content]);

  const unresolvedComments = rootComments.filter(c => !c.resolved);
  const resolvedComments = rootComments.filter(c => c.resolved);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newCommentText.trim() && selectedText) {
      onAddComment(selectedText, newCommentText.trim());
      setNewCommentText('');
      setIsAdding(false);
    }
  };

  const handleReply = (e, parentComment) => {
    e.preventDefault();
    if (replyText.trim()) {
      onAddComment(parentComment.anchor, replyText.trim(), parentComment.id);
      setReplyText('');
      setReplyingTo(null);
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
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={repliesByParent[comment.id] || []}
                onResolve={() => onResolveComment(comment.id)}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                onReply={(e) => handleReply(e, comment)}
                onNavigateToAnchor={onNavigateToAnchor}
              />
            ))}

            {resolvedComments.length > 0 && (
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                  {resolvedComments.length} resolved comment{resolvedComments.length > 1 ? 's' : ''}
                </summary>
                <div className="mt-2 space-y-2 opacity-60">
                  {resolvedComments.map((comment) => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      replies={repliesByParent[comment.id] || []}
                      resolved
                      onNavigateToAnchor={onNavigateToAnchor}
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

function CommentThread({ comment, replies, onResolve, resolved, replyingTo, setReplyingTo, replyText, setReplyText, onReply, onNavigateToAnchor }) {
  const isReplying = replyingTo === comment.id;

  return (
    <div className="space-y-2">
      <CommentCard
        comment={comment}
        onResolve={onResolve}
        resolved={resolved}
        onReplyClick={!resolved && setReplyingTo ? () => setReplyingTo(comment.id) : null}
        onNavigateToAnchor={onNavigateToAnchor}
      />

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-4 pl-2 border-l-2 border-gray-600 space-y-2">
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              resolved={resolved}
              isReply
            />
          ))}
        </div>
      )}

      {/* Reply form */}
      {isReplying && (
        <form onSubmit={onReply} className="ml-4 pl-2 border-l-2 border-blue-500 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="flex-1 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => { setReplyingTo(null); setReplyText(''); }}
              className="flex-1 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function CommentCard({ comment, onResolve, resolved, onReplyClick, isReply, onNavigateToAnchor }) {
  const isHuman = comment.author === 'human';

  const handleAnchorClick = () => {
    if (onNavigateToAnchor && comment.anchor) {
      onNavigateToAnchor(comment.anchor);
    }
  };

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

      {!isReply && (
        <div
          className="text-xs text-gray-400 italic mb-1 truncate cursor-pointer hover:text-blue-400"
          title={`Click to jump to: ${comment.anchor}`}
          onClick={handleAnchorClick}
        >
          on: "{comment.anchor?.slice(0, 40)}{comment.anchor?.length > 40 ? '...' : ''}"
        </div>
      )}

      <div className="text-gray-200">{comment.text}</div>

      <div className="flex gap-3 mt-2">
        {!resolved && onResolve && (
          <button
            onClick={onResolve}
            className="text-xs text-gray-400 hover:text-white"
          >
            ✓ Resolve
          </button>
        )}
        {onReplyClick && (
          <button
            onClick={onReplyClick}
            className="text-xs text-gray-400 hover:text-white"
          >
            ↩ Reply
          </button>
        )}
      </div>
    </div>
  );
}
