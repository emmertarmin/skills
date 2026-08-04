# Personal agent skills and Pi extensions

A collection of skills and extensions I use with AI coding agents.

## Skills

- **cfml-format-and-lint** — Format CFML with `cfformat` and lint it with CFLint.
- **memory** — Search, retrieve, and write indexed Markdown knowledge using the `memory` CLI.
- **messer-und-gabel** — Download and extract the current Messer & Gabel weekly lunch menu.
- **pimred-configuration** — Edit PIM.RED instance and module configuration.
- **pimred-plugins** — Install, configure, troubleshoot, and document PIM.RED plugins.
- **redmine** — Read and, when explicitly requested, update Redmine through its CLI and API.
- **rtm-cli** — Manage Remember The Milk tasks, lists, and tags.
- **sentry-cli** — Retrieve Sentry issues, events, and logs.
- **subagent-orchestration** — Coordinate Pi subagents in tmux and collect their durable JSONL results.
- **textile** — Write, review, and convert Redmine Textile markup.

Install skills from this repository with [`skills`](https://skills.sh/):

```sh
npx skills add emmertarmin/skills
```

Some skills require the external tools or credentials described in their `SKILL.md` files.

## Pi extensions

The [`extensions`](./extensions) directory contains my current [Pi extensions](https://github.com/earendil-works/pi-mono):

- **handoff.ts** — Generate an editable prompt and transfer work into a fresh session.
- **presentation-view.ts** — Show a full-screen, scrollable prompt-and-answer presentation view with `F8`.
- **review-editor.ts** — Add `/review` and `/code-review` reviewer workflows.
- **herdr-agent-state.ts** — Report Pi state to herdr. This file is generated and managed by herdr and may be overwritten when that integration is updated.

`npx skills` installs skills, not Pi extensions. Install an extension separately by copying or symlinking it into `~/.pi/agent/extensions/`, for example:

```sh
ln -s "$PWD/extensions/handoff.ts" ~/.pi/agent/extensions/handoff.ts
```
