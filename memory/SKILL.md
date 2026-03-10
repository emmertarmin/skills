---
name: memory
description: Semantic search, retrieval, and writing of indexed markdown files. Use for finding or writing notes, documentation, profiles, workflows, episodic events and knowledge.
---

# Memory Skill

Semantic search and retrieval from your markdown memories.

## Commands

| Command                           | Purpose                          |
| --------------------------------- | -------------------------------- |
| `memory search "<query>"`         | Find content by semantic meaning |
| `memory get <file> <start> <end>` | Retrieve specific line range     |
| `memory sources`                  | List where memories are stored   |

Files are automatically indexed before each search query.

## Workflow

**Finding memories:**

1. Search: `memory search "summer family vacation Tirol coffeeshop"` -> returns relevant previews with file paths and line ranges.
2. Retrieve: `memory get 2025-08-02.md 672 689`

**Writing memories:**
Simply create or append to markdown files. By convention, use `YYYY-MM-DD.md` in the most appropriate memory folder (`memory sources`)

## Tips

- Be specific in searches
- Retrieve generous ranges (20-50 lines) for context
- Higher scores = better semantic matches
- When in doubt, use `memory search --help` to learn how to refine or expand search results
