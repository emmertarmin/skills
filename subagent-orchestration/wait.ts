#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const usage = `Usage: node wait.ts <session.jsonl> [options]

Options:
  --count <n>            Latest assistant entries to print (default: 1)
  --timeout <seconds>    Maximum wait (default: 1800)
  --poll <milliseconds>  Poll interval (default: 500)`;

function positiveNumber(value, option, integer = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) {
    throw new Error(`${option} must be a positive ${integer ? "integer" : "number"}`);
  }
  return number;
}

function parseArgs(argv) {
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    console.log(usage);
    process.exit(argv.length ? 0 : 2);
  }

  const options = { path: argv[0], count: 1, timeout: 1800, poll: 500 };
  for (let index = 1; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`Missing value for ${option}`);
    if (option === "--count") options.count = positiveNumber(value, option, true);
    else if (option === "--timeout") options.timeout = positiveNumber(value, option);
    else if (option === "--poll") options.poll = positiveNumber(value, option, true);
    else throw new Error(`Unknown option: ${option}`);
  }
  return options;
}

function parseSession(text) {
  const entries = [];
  for (const [index, rawLine] of text.split("\n").entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      entries.push(JSON.parse(line));
    } catch (error) {
      // A writer may have left the final JSONL line incomplete between reads.
      if (index === text.split("\n").length - 1 && !text.endsWith("\n")) break;
      throw new Error(`Invalid JSON on line ${index + 1}: ${error.message}`);
    }
  }
  return entries;
}

function activeBranch(entries) {
  const treeEntries = entries.filter((entry) => entry && entry.id && entry.type !== "session");
  if (!treeEntries.length) return [];

  // Pi appends an entry whenever its current leaf changes, so the last tree entry
  // identifies the active leaf. Walk parentId links to discard abandoned branches.
  const byId = new Map(treeEntries.map((entry) => [entry.id, entry]));
  const branch = [];
  const seen = new Set();
  let current = treeEntries.at(-1);
  while (current) {
    if (seen.has(current.id)) throw new Error(`Cycle in session tree at ${current.id}`);
    seen.add(current.id);
    branch.push(current);
    if (current.parentId == null) break;
    current = byId.get(current.parentId);
    if (!current) throw new Error(`Missing parent entry: ${branch.at(-1).parentId}`);
  }
  return branch.reverse();
}

function completedAssistants(branch) {
  const finalReasons = new Set(["stop", "length", "error", "aborted"]);
  const leaf = branch.at(-1);
  if (
    leaf?.type !== "message" ||
    leaf.message?.role !== "assistant" ||
    !finalReasons.has(leaf.message.stopReason)
  ) return null;

  return branch.filter(
    (entry) => entry.type === "message" && entry.message?.role === "assistant"
  );
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const deadline = Date.now() + options.timeout * 1000;
  let lastReadError;

  while (Date.now() <= deadline) {
    try {
      const entries = parseSession(await readFile(options.path, "utf8"));
      const assistants = completedAssistants(activeBranch(entries));
      if (assistants) {
        const result = assistants.slice(-options.count);
        console.log(JSON.stringify(options.count === 1 ? result[0] : result, null, 2));
        return;
      }
      lastReadError = undefined;
    } catch (error) {
      lastReadError = error;
    }
    await sleep(Math.min(options.poll, Math.max(0, deadline - Date.now())));
  }

  const detail = lastReadError ? ` Last error: ${lastReadError.message}` : "";
  throw new Error(`Timed out after ${options.timeout}s waiting for ${options.path}.${detail}`);
}

main().catch((error) => {
  console.error(`wait.ts: ${error.message}`);
  process.exit(1);
});
