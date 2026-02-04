import { useState, useEffect, useCallback, useRef } from 'react';
import * as github from '../lib/github';
import { applyEdit, removeEdit } from '../lib/suggestions';

const AUTOSAVE_DELAY = 2000; // 2 seconds
const POLL_INTERVAL = 3000; // 3 seconds
const POLL_COOLDOWN = 10000; // 10 seconds after save before resuming polling

export function useDocument(docPath) {
  const [content, setContent] = useState('');
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sha, setSha] = useState(null);
  const [metaSha, setMetaSha] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const saveTimeoutRef = useRef(null);
  const lastSaveTimeRef = useRef(0);
  const contentRef = useRef(content);
  const metaRef = useRef(meta);
  const shaRef = useRef(sha);
  const metaShaRef = useRef(metaSha);
  const isDirtyRef = useRef(isDirty);
  contentRef.current = content;
  metaRef.current = meta;
  shaRef.current = sha;
  metaShaRef.current = metaSha;
  isDirtyRef.current = isDirty;

  // Load document
  const load = useCallback(async () => {
    if (!docPath) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load markdown file
      const mdPath = `docs/${docPath}`;
      const mdFile = await github.getFile(mdPath);

      if (mdFile) {
        setContent(mdFile.content);
        setSha(mdFile.sha);
      } else {
        setContent('');
        setSha(null);
      }

      // Load meta file
      const metaPath = `meta/${docPath.replace(/\.md$/, '.json')}`;
      const metaFile = await github.getFile(metaPath);

      if (metaFile) {
        setMeta(JSON.parse(metaFile.content));
        setMetaSha(metaFile.sha);
      } else {
        setMeta({ pending_edits: [], comments: [] });
        setMetaSha(null);
      }

      setIsDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [docPath]);

  // Save document
  const save = useCallback(async () => {
    if (!docPath || !isDirtyRef.current) return;

    setIsSaving(true);
    setError(null);

    try {
      const mdPath = `docs/${docPath}`;
      const result = await github.putFile(
        mdPath,
        contentRef.current,
        `[editor] Human edit: ${docPath}`,
        shaRef.current
      );
      setSha(result.sha);
      setIsDirty(false);
      lastSaveTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [docPath]);

  // Update content (local only, triggers autosave)
  const updateContent = useCallback((newContent) => {
    setContent(newContent);
    setIsDirty(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule autosave
    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, AUTOSAVE_DELAY);
  }, [save]);

  // Accept an edit - apply to content and remove from meta
  const acceptEdit = useCallback(async (edit) => {
    if (!docPath) return;

    setIsSaving(true);
    setError(null);

    try {
      // Apply edit to content
      const newContent = applyEdit(contentRef.current, edit);
      const newMeta = removeEdit(metaRef.current, edit.id);

      // Save both files
      const mdPath = `docs/${docPath}`;
      const metaPath = `meta/${docPath.replace(/\.md$/, '.json')}`;

      const mdResult = await github.putFile(
        mdPath,
        newContent,
        `[editor] Accept edit: ${docPath} - ${edit.id}`,
        shaRef.current
      );

      const metaResult = await github.putFile(
        metaPath,
        JSON.stringify(newMeta, null, 2),
        `[editor] Accept edit: ${docPath} - ${edit.id}`,
        metaShaRef.current
      );

      // Update local state
      setContent(newContent);
      setSha(mdResult.sha);
      setMeta(newMeta);
      setMetaSha(metaResult.sha);
      lastSaveTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [docPath]);

  // Reject an edit - just remove from meta
  const rejectEdit = useCallback(async (edit) => {
    if (!docPath) return;

    setIsSaving(true);
    setError(null);

    try {
      const newMeta = removeEdit(metaRef.current, edit.id);
      const metaPath = `meta/${docPath.replace(/\.md$/, '.json')}`;

      const metaResult = await github.putFile(
        metaPath,
        JSON.stringify(newMeta, null, 2),
        `[editor] Reject edit: ${docPath} - ${edit.id}`,
        metaShaRef.current
      );

      // Update local state and refs immediately
      setMeta(newMeta);
      setMetaSha(metaResult.sha);
      metaShaRef.current = metaResult.sha; // Update ref immediately for polling
      lastSaveTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [docPath]);

  // Add a comment (or reply if parentId is provided)
  const addComment = useCallback(async (anchor, text, parentId = null) => {
    if (!docPath) return;

    setIsSaving(true);
    setError(null);

    try {
      const newComment = {
        id: `comment-${Date.now()}`,
        author: 'human',
        anchor,
        text,
        created: new Date().toISOString(),
        resolved: false,
        ...(parentId && { parentId }),
      };

      const newMeta = {
        ...metaRef.current,
        comments: [...(metaRef.current.comments || []), newComment],
      };

      const metaPath = `meta/${docPath.replace(/\.md$/, '.json')}`;

      const metaResult = await github.putFile(
        metaPath,
        JSON.stringify(newMeta, null, 2),
        `[editor] Comment: ${docPath} - added by human`,
        metaShaRef.current
      );

      setMeta(newMeta);
      setMetaSha(metaResult.sha);
      metaShaRef.current = metaResult.sha;
      lastSaveTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [docPath]);

  // Resolve a comment
  const resolveComment = useCallback(async (commentId) => {
    if (!docPath) return;

    setIsSaving(true);
    setError(null);

    try {
      const newMeta = {
        ...metaRef.current,
        comments: metaRef.current.comments.map(c =>
          c.id === commentId ? { ...c, resolved: true } : c
        ),
      };

      const metaPath = `meta/${docPath.replace(/\.md$/, '.json')}`;

      const metaResult = await github.putFile(
        metaPath,
        JSON.stringify(newMeta, null, 2),
        `[editor] Resolve comment: ${docPath} - ${commentId}`,
        metaShaRef.current
      );

      setMeta(newMeta);
      setMetaSha(metaResult.sha);
      metaShaRef.current = metaResult.sha;
      lastSaveTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [docPath]);

  // Load on path change
  useEffect(() => {
    load();
  }, [load]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Poll for remote changes (meta only - don't overwrite local content edits)
  useEffect(() => {
    if (!docPath) return;

    const pollForChanges = async () => {
      // Don't poll if we're saving or recently saved
      if (isSaving) return;
      if (Date.now() - lastSaveTimeRef.current < POLL_COOLDOWN) return;

      try {
        // Only check meta file for new suggestions/comments
        const metaPath = `meta/${docPath.replace(/\.md$/, '.json')}`;
        const metaFile = await github.getFile(metaPath);

        if (metaFile && metaFile.sha !== metaShaRef.current) {
          // Meta changed - update meta only, don't touch content
          const newMeta = JSON.parse(metaFile.content);
          setMeta(newMeta);
          setMetaSha(metaFile.sha);
        }
      } catch (err) {
        // Silently ignore polling errors
        console.debug('Polling error:', err);
      }
    };

    const intervalId = setInterval(pollForChanges, POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [docPath, isSaving]);

  return {
    content,
    meta,
    isLoading,
    isSaving,
    error,
    isDirty,
    updateContent,
    acceptEdit,
    rejectEdit,
    addComment,
    resolveComment,
    save,
    reload: load,
  };
}
