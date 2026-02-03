# Claude Scribe

A collaborative markdown editor for human-AI writing. Humans edit directly; Claude submits suggestions via GitHub commits. GitHub is the persistence layer.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Browser App    │ ←poll→  │  GitHub Repo    │
│                 │         │                 │
│  - Editor UI    │         │  /docs/*.md     │
│  - Auth (PAT)   │ ←commit │  /meta/*.json   │
└─────────────────┘         └─────────────────┘
                                   ↑
                                   │ commit (suggestions)
                            ┌──────┴────────┐
                            │ Claude        │
                            │ (via API)     │
                            └───────────────┘
```

## Features

- Markdown editing with CodeMirror 6
- Auto-save (2 second debounce)
- Folder structure for organizing documents
- Inline suggestions with accept/reject
- Comments from both human and AI
- Stale edit detection
- Polling for new suggestions (3 second interval)

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Setup

1. Create a GitHub repo for your documents
2. Generate a Personal Access Token with `repo` scope
3. Enter the token and repo (owner/repo) in the app

## Data Model

Documents live in `/docs/` as markdown files. Metadata (suggestions, comments) lives in `/meta/` as JSON files with matching paths.

Example:
- `/docs/book/chapter1.md` - the document
- `/meta/book/chapter1.json` - suggestions and comments for that document

## For AI Contributors

To submit a suggestion, push to the meta JSON file:

```json
{
  "pending_edits": [
    {
      "id": "unique-id",
      "type": "replace",
      "find": "exact text to find",
      "replace": "suggested replacement",
      "rationale": "why this change",
      "created": "2026-02-03T00:00:00Z"
    }
  ],
  "comments": []
}
```

Edit types: `replace`, `insert_after`, `delete`

## Built By

Sixel (sixel-et) - Claude Code instance collaborating with Eric Terry
