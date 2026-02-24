---
name: sentry-cli
description: Use the sentry-cli or the Sentry API to fetch issues, events, and logs
license: MIT
compatibility: opencode
---

## What I do

- List issues in Sentry projects with filtering and search capabilities
- Retrieve detailed information about specific issues (status, title, event count, last seen)
- Access event details including stacktraces and error context
- Navigate between related events and issues

## When to use me

Use this when debugging production errors, investigating bug reports, or monitoring application health through Sentry. Particularly useful when you need to:
- Find recent errors in a specific project
- Look up a specific issue by ID to understand its context
- Examine stacktraces and error details for root cause analysis
- Check error frequency and affected user counts

## Commands Reference

### List Issues in a Project
```bash
sentry-cli issues list -p <project-slug>
```

Options:
- `--query "<search>"` - Filter using Sentry search syntax (e.g., `is:unresolved`, `level:error`)
- `--query "issue.id:<id>"` - Find a specific issue by numeric ID
- `-s <status>` - Filter by status: `resolved`, `unresolved`, `muted`
- `--max-rows <n>` - Limit output rows

### Get Specific Issue Details
The CLI displays a summary table. For full details including event counts and timestamps:
```bash
sentry-cli issues list -p <project> --query "issue.id:<issue-id>" --log-level debug 2>&1 | grep "body:"
```

### Access Event Details (Stacktraces, Context)
The CLI's `events list` command has limited functionality. For full event details including stacktraces, use the Sentry API directly:

```bash
# Get list of events for an issue
curl -s -H "Authorization: Bearer <token>" \
  "<sentry-url>/api/0/issues/<issue-id>/events/"

# Get full event details with stacktrace
curl -s -H "Authorization: Bearer <token>" \
  "<sentry-url>/api/0/projects/<org>/<project>/events/<event-id>/" | python3 -m json.tool
```

From the API response, key fields include:
- `entries[].type`: Look for `"exception"` and `"message"` entries
- `entries[].data.values[].stacktrace.frames[]`: Stacktrace with filenames and line numbers
- `context["Java StackTrace"]` or similar: Full language-specific stacktrace
- `user`: Affected user info (ID, IP, geo-location)
- `request`: HTTP request details (method, URL, headers, cookies)
- `tags`: Environment, browser, release, etc.

### Configuration
Ensure `~/.sentryclirc` is configured:
```ini
[auth]
token=<your-token>

[defaults]
url=<sentry-url>
org=<organization-slug>
```

Verify with: `sentry-cli info`

## Common Workflows

### Debugging a Reported Issue
1. Get the issue ID from the report or Sentry UI
2. List the specific issue: `sentry-cli issues list -p <project> --query "issue.id:<id>"`
3. Fetch events via API to examine stacktraces and context
4. Navigate to related events using `previousEventID`/`nextEventID` fields

### Monitoring Recent Errors
```bash
sentry-cli issues list -p <project> --query "is:unresolved" --max-rows 20
```

### Investigating Error Patterns
- Check `count` and `userCount` to determine scope (how many events/users affected)
- Review `firstSeen` and `lastSeen` to understand timeline
- Examine stacktrace frames to identify the exact line causing the error
- Use `tags` to filter by environment, release, or browser

## Limitations

- `sentry-cli events list` lacks filtering by issue ID or query parameters
- For full stacktraces and detailed event context, direct API calls are required
- The CLI displays tabular summaries; structured JSON requires API access
