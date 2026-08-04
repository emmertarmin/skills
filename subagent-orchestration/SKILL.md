---
name: subagent-orchestration
description: Spawn and coordinate independent Pi subagents in named tmux sessions, share durable Markdown plans between agents, inspect progress interactively, and collect completed results from Pi JSONL sessions. Use when delegating repository work, parallel reviews, investigations, or implementation tasks to one or more subagents.
compatibility: Requires pi, tmux, and Node.js.
---

# Subagent orchestration

Run each subagent in its own named tmux session and give every agent durable files for coordination. Treat the JSONL session as authoritative for completion and results; tmux is for interactive observation.

## Prepare

1. Choose a short, unique tmux name for each agent. Tell the user the names so they can run `tmux attach -t <name>`.
2. Create one shared run directory with `mktemp -d`.
3. Create `<run-dir>/plan.md` for shared goals, decisions, ownership, dependencies, and status. For multiple agents, also create `<run-dir>/tasks/<name>.md` with each complete assignment.
4. Tell every agent to read `plan.md`, update its own status section there when useful, avoid overwriting other agents' work, and put substantial findings in its task file or another named Markdown file.
5. Create each exact session path before launch: `touch <run-dir>/<name>.jsonl`.

Avoid concurrent edits to the same source files. Assign ownership by file or use review-only agents. Shared Markdown is coordination state, not a substitute for inspecting the repository.

## Spawn

From the target working directory, launch installed `pi` directly (do not use project wrappers):

```sh
tmux new-session -d -s <name> -x 120 -y 40 -c "$PWD" -- \
  pi \
  --session <run-dir>/<name>.jsonl \
  --provider "$PI_PROVIDER" \
  --model "$PI_MODEL" \
  --thinking "$PI_REASONING_LEVEL" \
  @<run-dir>/tasks/<name>.md
```

Pass arguments as separate words; do not build a quoted command string. If a required `PI_*` variable is empty, omit that option and let Pi use its configured default.

Inspect or interact at any time:

```sh
tmux capture-pane -t <name> -p
tmux attach -t <name>
```

Detach with tmux's normal prefix followed by `d`. Do not kill an agent that is still working unless the user requests cancellation.

## Wait and collect

Resolve `wait.ts` relative to this SKILL.md and run it against each exact session file:

```sh
node ~/.pi/agent/skills/subagent-orchestration/wait.ts <run-dir>/<name>.jsonl
```

Options:

```text
--count <n>           Latest assistant entries to print (default: 1)
--timeout <seconds>   Maximum wait (default: 1800)
--poll <milliseconds> Poll interval (default: 500)
```

Set the bash-tool timeout longer than `--timeout`. The script follows the active JSONL branch and only settles on a final assistant response (`stop`, `length`, `error`, or `aborted`), not an intermediate `toolUse`. A nonzero exit indicates invalid arguments, an unreadable/invalid session, or timeout.

For parallel agents, start separate waits concurrently when possible. Read both the returned assistant entry and any shared Markdown artifacts before synthesizing results. The coordinator remains responsible for reconciling conflicts and verifying changes/tests.

## Cleanup

After results and artifacts have been reviewed:

```sh
tmux kill-session -t <name> 2>/dev/null || true
rm -rf <run-dir>
```

Keep the run directory when the transcript or coordination files are still useful. Never delete it merely because one agent finished while others still use it.
