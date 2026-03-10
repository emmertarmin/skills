---
name: changelog-writer
description: Write CHANGELOG.md entries following Keep a Changelog format. Use when documenting version releases, new features, bug fixes, or breaking changes.
---

# Changelog Writer

Format for CHANGELOG.md entries:

```markdown
# Changelog

## vX.Y.Z

### Added or Changed
- Description of change
- Another change

### Removed
- Description of removed feature
```

## Format Rules

- **Title**: `# Changelog`
- **Versions**: `## vX.Y.Z` (follows [SemVer](https://semver.org/))
- **Categories**: `### Added or Changed`, `### Removed` (primary); `### Fixed`, `### Deprecated` (as needed)
- **Entries**: Bullet points starting with `- `, past tense, descriptive but concise
- **Order**: Newest version first
- **References**: Add issue/PR numbers when relevant: `(#123)`

## Examples

```markdown
## v1.2.0

### Added or Changed
- Added dark mode support
- Implemented user profile page
```

```markdown
## v1.1.1

### Fixed
- Fixed authentication error on login page
```

## Workflow

1. Read existing `CHANGELOG.md` if present
2. Determine version bump (major/minor/patch per SemVer)
3. Draft entries and insert at the top
4. Run `bun x oxfmt CHANGELOG.md` to ensure formatting consistency
