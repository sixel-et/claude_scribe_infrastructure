import { useMemo, useState, useCallback } from 'react';

// Parse headers from markdown content
function parseHeaders(content) {
  if (!content) return [];

  const headers = [];
  const lines = content.split('\n');
  let offset = 0;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headers.push({
        level: match[1].length,
        text: match[2].trim(),
        offset: offset,
      });
    }
    offset += line.length + 1; // +1 for newline
  }

  return headers;
}

export function TableOfContents({ content, onNavigate, collapsed, onToggleCollapsed }) {
  const headers = useMemo(() => parseHeaders(content), [content]);

  const handleClick = useCallback((header) => {
    if (onNavigate) {
      onNavigate(header.offset);
    }
  }, [onNavigate]);

  if (headers.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-700">
      <button
        onClick={onToggleCollapsed}
        className="w-full px-3 py-2 text-left text-xs font-medium text-gray-400 hover:text-white flex items-center justify-between"
      >
        <span>TABLE OF CONTENTS</span>
        <span className="text-gray-500">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <nav className="px-2 pb-2 max-h-64 overflow-y-auto">
          {headers.map((header, index) => (
            <button
              key={index}
              onClick={() => handleClick(header)}
              className="block w-full text-left px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded truncate"
              style={{ paddingLeft: `${(header.level - 1) * 12 + 8}px` }}
              title={header.text}
            >
              {header.text}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
