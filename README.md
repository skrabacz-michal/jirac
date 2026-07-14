# jirac

A free, minimal CLI for self-hosted Jira — an in-house alternative to
Appfire's paid ACLI/Jira CLI.

## Install

```
bun install
```

Then either:

```
bun link          # get the global `jirac` command
```

or run directly from source:

```
bun bin/jirac.js ...
```

## Setup

Copy `.env.example` to `.env` and fill in `JIRA_BASE_URL` and `JIRA_TOKEN`:

```
cp .env.example .env
```

`JIRA_TOKEN` is a Personal Access Token, created from your Jira profile →
Personal Access Tokens screen. Bun loads `.env` automatically — no extra
setup needed.

## Usage

```
jirac get PROJ-123
jirac get PROJ-123 --fields summary,status --json

jirac search "project = PROJ AND status = 'In Progress'" --limit 10

jirac create --project PROJ --type Task --summary "Fix the thing"
jirac create        # launches the interactive wizard instead
```

## Troubleshooting

If you get a 401/403, check that Basic/Bearer auth isn't disabled at
`https://its.ottobock.com/plugins/servlet/authentication-config`, and that
your PAT hasn't expired.

## Standalone binary

To produce a single native executable that doesn't require a Bun install to
run:

```
bun build ./bin/jirac.js --compile --outfile jirac
```
