import { Octokit } from '@octokit/rest';

let octokit = null;
let repoOwner = null;
let repoName = null;

export function initGitHub(token, owner, repo) {
  octokit = new Octokit({ auth: token });
  repoOwner = owner;
  repoName = repo;
}

export function isInitialized() {
  return octokit !== null && repoOwner !== null && repoName !== null;
}

export function getRepoInfo() {
  return { owner: repoOwner, repo: repoName };
}

// Fetch file content from repo
export async function getFile(path) {
  if (!isInitialized()) throw new Error('GitHub not initialized');

  try {
    const response = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path,
    });

    if (response.data.type !== 'file') {
      throw new Error(`${path} is not a file`);
    }

    const content = atob(response.data.content);
    return {
      content,
      sha: response.data.sha,
      path: response.data.path,
    };
  } catch (error) {
    if (error.status === 404) {
      return null; // File doesn't exist
    }
    throw error;
  }
}

// Write file to repo
export async function putFile(path, content, message, sha = null) {
  if (!isInitialized()) throw new Error('GitHub not initialized');

  const params = {
    owner: repoOwner,
    repo: repoName,
    path,
    message,
    content: btoa(content),
  };

  if (sha) {
    params.sha = sha; // Required for updates
  }

  const response = await octokit.repos.createOrUpdateFileContents(params);
  return {
    sha: response.data.content.sha,
    commit: response.data.commit,
  };
}

// List directory contents
export async function listDir(path = '') {
  if (!isInitialized()) throw new Error('GitHub not initialized');

  try {
    const response = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path,
    });

    if (!Array.isArray(response.data)) {
      throw new Error(`${path} is not a directory`);
    }

    return response.data.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type, // 'file' or 'dir'
      sha: item.sha,
    }));
  } catch (error) {
    if (error.status === 404) {
      return []; // Directory doesn't exist
    }
    throw error;
  }
}

// Recursively list all files in a directory
export async function listAllFiles(path = '', extension = null) {
  const items = await listDir(path);
  let files = [];

  for (const item of items) {
    if (item.type === 'file') {
      if (!extension || item.name.endsWith(extension)) {
        files.push(item);
      }
    } else if (item.type === 'dir') {
      const subFiles = await listAllFiles(item.path, extension);
      files = files.concat(subFiles);
    }
  }

  return files;
}

// Create directory by creating a .gitkeep file
export async function createDir(path) {
  const gitkeepPath = `${path}/.gitkeep`;
  const existing = await getFile(gitkeepPath);

  if (!existing) {
    await putFile(gitkeepPath, '', `[editor] Create directory: ${path}`);
  }
}

// Ensure /docs and /meta directories exist
export async function ensureRepoStructure() {
  await createDir('docs');
  await createDir('meta');
}

// Verify token and repo access
export async function verifyAccess() {
  if (!isInitialized()) throw new Error('GitHub not initialized');

  try {
    await octokit.repos.get({
      owner: repoOwner,
      repo: repoName,
    });
    return { ok: true };
  } catch (error) {
    if (error.status === 401) {
      return { ok: false, error: 'Invalid token' };
    }
    if (error.status === 404) {
      return { ok: false, error: 'Repository not found' };
    }
    return { ok: false, error: error.message };
  }
}
