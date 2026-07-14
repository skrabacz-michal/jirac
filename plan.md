# Plan: jirac — Custom Jira REST CLI (Bun)

## Context

- Project name: **jirac** (a free, in-house replacement for the paid Appfire
  ACLI/Jira CLI).
- Target Jira instance: self-hosted Jira Server/Data Center at `https://its.ottobock.com`
- Auth: Personal Access Token (PAT), sent as `Authorization: Bearer <token>` per
  Jira's REST API (works out of the box on Data Center 8.14+, no server-side
  app/connector required — this is a plain REST client).
- Goal: cover the basics first: **get issue**, **search (JQL)**,
  **create issue**. More commands (transitions, comments, bulk ops) can be
  added later once this is working.
- **Runtime: Bun** (not Node). Reasons already agreed on:
  - Bun auto-loads a `.env` file in the project root — no custom loader needed.
  - Built-in global `fetch` (same as Node 18+, no change to `client.js` logic).
  - `bun build --compile` can produce a single native executable as a later,
    optional step — no runtime install needed on the machine that runs it.
  - Bun Shell (`Bun.$`) was evaluated and is **not used** here — it's for
    shelling out to system commands, and this CLI only makes HTTP calls. Keep
    in mind for a future "pipe output to an external tool" feature, but out of
    scope now.
- Dependencies: `commander` (arg parsing) + `@clack/prompts` (interactive
  wizard for `create` only, see below). Both are plain npm packages and work
  fine under Bun (`bun add <pkg>`).

## Target file structure

```
jirac/
  package.json
  .env.example
  .gitignore
  README.md
  bin/
    jirac.js            # commander entry point, wires up subcommands
  src/
    client.js           # JiraClient class wrapping fetch + PAT auth
    commands/
      get.js             # get <issueKey> [--fields] [--json]
      search.js           # search <jql> [--limit] [--json]
      create.js           # create [--project --type --summary --description] [--json]
                           # falls into an interactive @clack/prompts wizard
                           # when run with NO flags at all
```

No `src/env.js` in this version — Bun's automatic `.env` loading replaces it.

The CLI command itself is invoked as `jirac` (e.g. `jirac get PROJ-123`).

## Already drafted (reuse this content, don't redesign)

The following files were already written and reviewed in a prior session.
Recreate them exactly as specified below rather than rewriting from scratch,
adjusting only for the Bun-specific changes and the `jirac` naming noted inline.

### `package.json`
```json
{
  "name": "jirac",
  "version": "1.0.0",
  "description": "jirac — a minimal self-hosted Jira CLI (get/search/create issues) using PAT auth against the REST API",
  "type": "module",
  "bin": {
    "jirac": "./bin/jirac.js"
  },
  "engines": {
    "bun": ">=1.1.0"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "@clack/prompts": "^1.7.0"
  }
}
```

### `.env.example`
```
# Copy this file to .env (or export these as real environment variables)
# and fill in your values. Never commit the real .env file.
# Bun loads .env automatically — no extra setup needed.

JIRA_BASE_URL=https://its.ottobock.com
JIRA_TOKEN=your-personal-access-token-here
```

### `src/client.js`
Exports:
- `class JiraClient` — constructed with `{ baseUrl, token }`; throws a clear
  error if either is missing. Strips trailing slash from `baseUrl`.
  - `request(path, { method, body })` — internal helper. Sends
    `Authorization: Bearer <token>`, `Accept: application/json`, and
    `Content-Type: application/json` when a body is present. Parses JSON
    response; on non-2xx status, throws an `Error` including status, status
    text, and any `errorMessages`/`message` from the response body.
  - `getIssue(key, fields)` → `GET /rest/api/2/issue/{key}[?fields=...]`
  - `searchIssues(jql, { maxResults = 25, fields })` →
    `POST /rest/api/2/search` with `{ jql, maxResults, fields }` (default
    fields: `["summary","status","assignee","issuetype"]`)
  - `createIssue({ project, type, summary, description })` →
    `POST /rest/api/2/issue` with the standard
    `{ fields: { project: { key }, issuetype: { name }, summary, description } }`
    shape (Jira Server v2 API, plain-text description — not ADF).
- `clientFromEnv()` — convenience constructor reading `JIRA_BASE_URL` and
  `JIRA_TOKEN` from `process.env` (populated automatically by Bun from `.env`).

### `src/commands/get.js`
`getCommand(key, opts)`:
- Calls `clientFromEnv().getIssue(key, opts.fields)`.
- If `opts.json`, print the raw JSON (pretty-printed).
- Otherwise print a short human-readable summary: key, summary, type, status,
  assignee (or "Unassigned").

### `src/commands/search.js`
`searchCommand(jql, opts)`:
- Calls `clientFromEnv().searchIssues(jql, { maxResults: Number(opts.limit ?? 25) })`.
- If `opts.json`, print raw JSON.
- Otherwise print a one-line-per-issue table: key (padded), status (padded,
  bracketed), summary. Print a header line with total vs. shown count.

## Remaining work (build this now)

1. **`src/commands/create.js`** — `createCommand(opts)`:
   - **Flag-driven path**: if `opts.project`, `opts.type`, and `opts.summary`
     are all present, skip prompts entirely — call
     `clientFromEnv().createIssue({ project, type, summary, description })`
     directly, exactly as in the original (non-interactive) plan.
   - **Interactive path**: if run with none of `--project`/`--type`/`--summary`
     supplied, use `@clack/prompts` to build a small wizard:
     ```js
     import { intro, outro, text, select, isCancel, cancel } from '@clack/prompts';

     intro('jirac — create a Jira issue');

     const project = await text({ message: 'Project key:' });
     if (isCancel(project)) { cancel('Cancelled.'); process.exit(0); }

     const type = await select({
       message: 'Issue type:',
       options: [
         { value: 'Task', label: 'Task' },
         { value: 'Bug', label: 'Bug' },
         { value: 'Story', label: 'Story' },
       ],
     });
     if (isCancel(type)) { cancel('Cancelled.'); process.exit(0); }

     const summary = await text({
       message: 'Summary:',
       validate(v) { if (!v) return 'Summary is required'; },
     });
     if (isCancel(summary)) { cancel('Cancelled.'); process.exit(0); }

     const description = await text({ message: 'Description (optional):' });
     if (isCancel(description)) { cancel('Cancelled.'); process.exit(0); }
     ```
     Then call `createIssue` with the collected values and `outro(...)` a
     success/failure message.
   - **Mixed case** (some flags given, not all): treat as flag-driven and
     just fail with a clear "missing --project/--type/--summary" error rather
     than silently falling back to prompts — avoids a confusing half-wizard.
   - On success (either path), print the new issue key and its browse URL
     (`${JIRA_BASE_URL}/browse/${key}`). If `opts.json`, print raw JSON instead
     (only applies to the flag-driven path — `--json` + interactive wizard
     doesn't make sense together, so ignore `--json` if prompts were used, or
     just print JSON at the very end after the wizard completes — either is
     fine, pick one and be consistent).

2. **`bin/jirac.js`** — the executable entry point:
   - `#!/usr/bin/env bun` shebang, must be marked executable (`chmod +x`).
   - No `loadEnv()` call needed — Bun handles `.env` automatically before the
     script even runs.
   - Use `commander` to define a top-level `jirac` program with three
     subcommands:
     - `get <key>` with `--fields <csv>` and `--json` flags → `getCommand`
     - `search <jql>` with `--limit <n>` (default 25) and `--json` flags →
       `searchCommand`
     - `create` with **optional** `--project`, `--type`, `--summary`,
       `--description`, and `--json` flags (optional now, not required —
       their absence is what triggers the interactive wizard) → `createCommand`
   - Wrap each command's action in a try/catch that prints
     `Error: <message>` to stderr and exits with code 1 on failure (so
     REST/auth errors from `client.js` surface cleanly instead of an ugly
     stack trace).

3. **`.gitignore`** — at minimum ignore `.env`, `node_modules/`.

4. **`README.md`** — short usage doc covering:
   - Title it `jirac` and describe it in one line as a free, minimal CLI for
     self-hosted Jira, built as an in-house alternative to Appfire's paid
     ACLI/Jira CLI.
   - Install: `bun install`, then either `bun link` (to get the global `jirac`
     command) or run via `bun bin/jirac.js ...`.
   - Setup: copy `.env.example` to `.env`, fill in `JIRA_BASE_URL` and
     `JIRA_TOKEN` (a Jira PAT created from the user's profile → Personal
     Access Tokens screen). Note that Bun loads `.env` automatically.
   - Usage examples for all three commands, e.g.:
     ```
     jirac get PROJ-123
     jirac search "project = PROJ AND status = 'In Progress'" --limit 10
     jirac create --project PROJ --type Task --summary "Fix the thing"
     jirac create        # launches the interactive wizard instead
     ```
   - A troubleshooting note: if a 401/403 comes back, check that Basic/Bearer
     auth isn't disabled at
     `https://its.ottobock.com/plugins/servlet/authentication-config`, and
     that the PAT hasn't expired.
   - An optional "Standalone binary" section documenting
     `bun build ./bin/jirac.js --compile --outfile jirac` to produce a
     single native executable, for anyone who wants to run this without a
     Bun install.

5. **Sanity check** — after writing all files:
   - Run `bun install`.
   - Run `bun run bin/jirac.js --help` to confirm there are no
     syntax/import errors and all three subcommands are listed with their
     options.
   - Do **not** attempt a live network call against `its.ottobock.com` from
     the build environment — that instance is only reachable from the user's
     own network. Just confirm:
     - the CLI fails with a clean "Missing JIRA_TOKEN" style error when no
       `.env`/env vars are present, for `get` and `search` and flag-driven
       `create`.
     - running `create` with zero flags actually enters the clack wizard
       (can verify by piping/cancelling immediately with Ctrl+C equivalent —
       confirm it exits cleanly rather than throwing).

## Explicit non-goals (for this pass)

- No transitions, comments, or bulk operations yet — get/search/create only.
- No OAuth support — PAT/Bearer only.
- No packaging/publishing (npm registry, Homebrew, etc.) beyond the optional
  `bun build --compile` binary — this is an internal tool run from source.
- No support for the Jira Cloud auth style (email + API token) — this
  instance is self-hosted Data Center only.
- No use of Bun Shell (`Bun.$`) — this CLI only makes HTTP calls, no
  subprocess/shell invocation needed.
- No interactive mode for `get`/`search` — only `create` gets the clack
  wizard; the other two stay flag/argument-only for fast scripted use.

