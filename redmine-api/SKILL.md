---
name: redmine-api
description: READ-ONLY Redmine API for querying issues, descriptions, comments, and time entries. WRITE operations are STRICTLY FORBIDDEN unless explicitly requested.
license: MIT
compatibility: opencode
metadata:
  category: project-management
  permissions: read-only
---

## Overview

Query Redmine issues, comments, and time entries via REST API. **READ access is permitted. WRITE operations (create, update, delete) are STRICTLY FORBIDDEN unless the user explicitly and unquestionably requests them.**

## Environment Variables

Both variables are pre-configured in `.bashrc`:
- `$REDMINE_API_URL` - Base URL (e.g., `https://redmine.example.com`)
- `$REDMINE_API_TOKEN` - Your API authentication token

Example:
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" "$REDMINE_API_URL/issues.json"
```

## Common Queries

### Get Issue Details
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/issues/12345.json?include=journals"
```
Returns: subject, description, status, priority, assigned_to, custom_fields, and history.

### List My Assigned Issues
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/issues.json?assigned_to_id=me&sort=priority:desc,updated_on:desc"
```

### High Priority Tickets
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/issues.json?assigned_to_id=me&priority_id=3,4,5&sort=updated_on:asc"
```
Priority IDs: 1=Low, 2=Normal, 3=High, 4=Urgent, 5=Immediate

### Search by Keywords
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/issues.json?q=bug+crash&project_id=5,6,7&limit=100"
```

### Issues Updated Recently
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/issues.json?updated_on=%3E%3D2024-02-17&sort=updated_on:desc"
```

### Get Issue History/Comments
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/issues/12345.json?include=journals"
```
Journals contain all comments and status changes with timestamps.

### Time Entries for Issue
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/time_entries.json?issue_id=12345"
```

### My Time Entries
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/time_entries.json?user_id=me&limit=100"
```

### Stale Tickets (No Recent Updates)
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/issues.json?assigned_to_id=me&updated_on=%3C%3D2024-01-01&sort=updated_on:asc&limit=3"
```

## Query Parameters Reference

**Filtering:**
- `project_id` - Filter by project (comma-separated for multiple)
- `tracker_id` - Filter by tracker type
- `status_id` - Filter by status (use `open` for all open, `closed` for closed)
- `priority_id` - Filter by priority
- `assigned_to_id` - Filter by assignee (use `me` for current user)
- `author_id` - Filter by author
- `query_id` - Use saved query ID
- `cf_N` - Filter by custom field value (where N is custom field ID)

**Sorting:**
- `sort=updated_on:desc` - Most recently updated first
- `sort=priority:desc,updated_on:asc` - By priority, then by staleness
- `sort=created_on:desc` - Newest first

**Pagination:**
- `limit` - Results per page (max 100, default 25)
- `offset` - Skip N results
- Response includes: `total_count`, `limit`, `offset`

**Includes (for detailed data):**
- `include=journals` - Comments and history
- `include=attachments` - File attachments metadata
- `include=relations` - Related issues
- `include=changesets` - Repository commits
- `include=watchers` - Users watching the issue

## Likely Usage Patterns

1. **"What is ticket #12345 about?"**
   - GET /issues/12345.json with journals

2. **"What are my highest priority tickets?"**
   - GET /issues.json?assigned_to_id=me&priority_id=3,4,5&sort=priority:desc

3. **"Quick tickets I could work through fast?"**
   - GET /issues.json?assigned_to_id=me&estimated_hours=%3C%3D2&status_id=open

4. **"Updates on ticket #12345 last week?"**
   - GET /issues/12345.json?include=journals, then filter journals by date

5. **"Find tickets about {keywords} in {projects}"**
   - GET /issues.json?q={keywords}&project_id={project_ids}&limit=100

6. **"Tickets assigned to me ready for deployment"**
   - GET /issues.json?assigned_to_id=me&status_id={ready_status}&cf_{deployment_flag}={value}

7. **"Top 3 stalest tickets assigned to me"**
   - GET /issues.json?assigned_to_id=me&sort=updated_on:asc&limit=3

## Response Structures

**Issue object:**
```json
{
  "issue": {
    "id": 12345,
    "project": {"id": 5, "name": "Project Name"},
    "tracker": {"id": 1, "name": "Bug"},
    "status": {"id": 2, "name": "In Progress"},
    "priority": {"id": 4, "name": "High"},
    "author": {"id": 10, "name": "John Doe"},
    "assigned_to": {"id": 11, "name": "Jane Smith"},
    "subject": "Issue title",
    "description": "Issue description...",
    "start_date": "2024-02-01",
    "due_date": "2024-02-15",
    "done_ratio": 50,
    "estimated_hours": 4.0,
    "created_on": "2024-02-01T10:00:00Z",
    "updated_on": "2024-02-20T15:30:00Z",
    "custom_fields": [{"id": 1, "name": "Version", "value": "1.0"}],
    "journals": [...],
    "attachments": [...]
  }
}
```

**Journal (comment/history):**
```json
{
  "id": 9876,
  "user": {"id": 10, "name": "John Doe"},
  "notes": "Comment text...",
  "created_on": "2024-02-20T15:30:00Z",
  "details": [
    {"property": "attr", "name": "status_id", "old_value": "1", "new_value": "2"}
  ]
}
```

**Time entry:**
```json
{
  "id": 5432,
  "project": {"id": 5, "name": "Project Name"},
  "issue": {"id": 12345},
  "user": {"id": 10, "name": "John Doe"},
  "activity": {"id": 9, "name": "Development"},
  "hours": 2.5,
  "comments": "Worked on bug fix",
  "spent_on": "2024-02-20",
  "created_on": "2024-02-20T17:00:00Z"
}
```

## Helper Endpoints

**Get current user:**
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" "$REDMINE_API_URL/my/account.json"
```

**List projects:**
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" "$REDMINE_API_URL/projects.json"
```

**List trackers:**
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" "$REDMINE_API_URL/trackers.json"
```

**List issue statuses:**
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" "$REDMINE_API_URL/issue_statuses.json"
```

**List enumerations (priorities, activities):**
```bash
curl -H "X-Redmine-API-Key: $REDMINE_API_TOKEN" \
  "$REDMINE_API_URL/enumerations/issue_priorities.json"
```

## ⚠️ WRITE OPERATIONS FORBIDDEN

**DO NOT** perform any write operations unless the user explicitly and clearly requests them with statements like:
- "Create a new issue..."
- "Update ticket #12345 to..."
- "Add a comment to..."
- "Log time entry for..."
- "Close ticket #12345"
- "Change status of..."

**When in doubt, ASK for confirmation before writing.**

## Full API Documentation

Complete reference for all endpoints: https://www.redmine.org/projects/redmine/wiki/rest_api
