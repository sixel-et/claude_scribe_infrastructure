import { useState, useEffect } from 'react';
import * as github from '../lib/github';

export function DocPicker({ currentDoc, onSelect, onCreateDoc }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocPath, setNewDocPath] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const allFiles = await github.listAllFiles('docs', '.md');
      // Build tree structure
      const tree = buildTree(allFiles);
      setFiles(tree);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const buildTree = (files) => {
    const root = { children: {} };

    for (const file of files) {
      // Remove 'docs/' prefix
      const path = file.path.replace(/^docs\//, '');
      const parts = path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            isFile,
            children: {},
          };
        }
        current = current.children[part];
      }
    }

    return root.children;
  };

  const toggleExpand = (path) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleCreateDoc = (e) => {
    e.preventDefault();
    if (newDocPath) {
      let path = newDocPath;
      if (!path.endsWith('.md')) {
        path += '.md';
      }
      onCreateDoc(path);
      setNewDocPath('');
      setShowNewDoc(false);
      // Reload files after creation
      setTimeout(loadFiles, 1000);
    }
  };

  const renderTree = (nodes, depth = 0) => {
    return Object.values(nodes).map((node) => {
      const isSelected = currentDoc === node.path;
      const isExpanded = expanded[node.path];

      if (node.isFile) {
        return (
          <div
            key={node.path}
            onClick={() => onSelect(node.path)}
            className={`
              flex items-center px-2 py-1 cursor-pointer rounded text-sm
              ${isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}
            `}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <span className="mr-2">📄</span>
            {node.name.replace(/\.md$/, '')}
          </div>
        );
      }

      return (
        <div key={node.path}>
          <div
            onClick={() => toggleExpand(node.path)}
            className="flex items-center px-2 py-1 cursor-pointer text-gray-300 hover:bg-gray-700 rounded text-sm"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <span className="mr-2">{isExpanded ? '📂' : '📁'}</span>
            {node.name}
          </div>
          {isExpanded && Object.keys(node.children).length > 0 && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 text-gray-400 text-sm">Loading...</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-gray-700">
        <button
          onClick={() => setShowNewDoc(!showNewDoc)}
          className="w-full py-1 px-2 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
        >
          + New Document
        </button>
      </div>

      {showNewDoc && (
        <form onSubmit={handleCreateDoc} className="p-2 border-b border-gray-700">
          <input
            type="text"
            value={newDocPath}
            onChange={(e) => setNewDocPath(e.target.value)}
            placeholder="path/to/document.md"
            className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewDoc(false)}
              className="flex-1 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-auto p-2">
        {Object.keys(files).length === 0 ? (
          <div className="text-gray-500 text-sm p-2">
            No documents yet. Create one to get started.
          </div>
        ) : (
          renderTree(files)
        )}
      </div>

      <div className="p-2 border-t border-gray-700">
        <button
          onClick={loadFiles}
          className="w-full py-1 px-2 text-sm text-gray-400 hover:text-gray-300"
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
