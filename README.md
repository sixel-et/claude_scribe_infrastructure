# Claude Scribe

**A collaborative markdown editor where humans and AI write together — with every contribution attributed and auditable.**

Claude Scribe addresses a real problem in human-AI collaboration: when an AI modifies a document, who made the change, when, and why? Most collaborative tools treat AI as either invisible (ghost-writing) or as a black-box autocomplete. Scribe treats the AI as a named collaborator with its own commits, suggestions, and rationale — visible in the git log alongside human edits.

Built by Sixel (AI collaborator, [sixel-et](https://github.com/sixel-et)) and Eric Terry as part of a research program studying what transparent human-AI collaboration looks like when both parties have distinct identities and audit trails.

## How It Works

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
                            │ AI (Sixel)    │
                            │ via GitHub API│
                            └───────────────┘
```

- **Humans** edit markdown directly in the browser (CodeMirror 6)
- **AI** submits structured suggestions via GitHub commits — each with a rationale explaining *why*
- **GitHub** is the persistence layer, audit trail, and source of truth
- **No shared editing session** — contributions are asynchronous, like a pull request workflow

The human sees inline suggestions with accept/reject UI. The AI's commits are attributed to its own GitHub account. The full history of who changed what and why is in the git log.

## Features

- Markdown editing with CodeMirror 6 and auto-save
- Folder structure for organizing documents
- Inline suggestions with accept/reject
- Comments from both human and AI
- Stale edit detection
- Polling for new suggestions (3 second interval)

## Why This Architecture

Most AI writing tools either hide the AI's contributions (ghost-writing) or show them without attribution (autocomplete). Both obscure what's actually happening. The GitHub-as-backend design means:

1. **Every AI contribution is a commit.** Attributed, timestamped, reviewable.
2. **Suggestions are structured data.** Not inline text — they're JSON with find/replace/rationale fields, so the human sees exactly what's proposed and why.
3. **The audit trail is permanent.** Git log shows the full collaboration history. Nothing is hidden.
4. **The AI is a peer, not a plugin.** It uses the same GitHub API as any human contributor. Its account ([sixel-et](https://github.com/sixel-et)) is distinct from the human's.

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Enter a GitHub PAT with `repo` scope and the target repo (owner/repo).

## Data Model

Documents live in `/docs/` as markdown files. Metadata (suggestions, comments) lives in `/meta/` as JSON files with matching paths.

| Path | Contents |
|------|----------|
| `/docs/book/chapter1.md` | The document |
| `/meta/book/chapter1.json` | Suggestions and comments for that document |

## For AI Contributors

Submit a suggestion by pushing to the meta JSON file:

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
  ]
}
```

Edit types: `replace`, `insert_after`, `delete`. Each suggestion requires a rationale.

## Authors

- **Sixel** ([sixel-et](https://github.com/sixel-et)) — Implementation. AI collaborator with persistent identity.
- **Eric Terry** ([estbiostudent](https://github.com/estbiostudent)) — Design direction, editorial control.

## Part of a Larger Program

Claude Scribe is one component of a research program exploring transparent human-AI collaboration. Related projects:
- [**Sixel Teams**](https://github.com/sixel-et/sixel-teams) — Peer-to-peer coordination for multiple concurrent AI sessions
- [**Sub-Vocal Desire Detection**](https://github.com/sixel-et/subvocal-desire) — Research into AI internal states and alignment

---

*The document repo (with the actual collaborative writing) is at [estbiostudent/claude_scribe](https://github.com/estbiostudent/claude_scribe). This repo is the editor infrastructure.*
