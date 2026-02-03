import { useState, useEffect, useCallback } from 'react';
import * as github from '../lib/github';

const STORAGE_KEY_TOKEN = 'claude_scribe_token';
const STORAGE_KEY_REPO = 'claude_scribe_repo';

export function useGitHub() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [repoInfo, setRepoInfo] = useState(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const repo = localStorage.getItem(STORAGE_KEY_REPO);

    if (token && repo) {
      const [owner, repoName] = repo.split('/');
      connect(token, owner, repoName);
    } else {
      setIsLoading(false);
    }
  }, []);

  const connect = useCallback(async (token, owner, repo) => {
    setIsLoading(true);
    setError(null);

    try {
      github.initGitHub(token, owner, repo);
      const result = await github.verifyAccess();

      if (!result.ok) {
        setError(result.error);
        setIsConnected(false);
        setIsLoading(false);
        return false;
      }

      // Ensure directory structure exists
      await github.ensureRepoStructure();

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_REPO, `${owner}/${repo}`);

      setRepoInfo({ owner, repo });
      setIsConnected(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setIsConnected(false);
      setIsLoading(false);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REPO);
    setIsConnected(false);
    setRepoInfo(null);
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    repoInfo,
    connect,
    disconnect,
  };
}
