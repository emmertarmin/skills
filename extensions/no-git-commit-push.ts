import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	getAgentDir,
	isToolCallEventType,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

type Policy = "allow" | "block" | "ask";

interface Config {
	projects: Record<string, Exclude<Policy, "ask">>;
}

const CONFIG_PATH = join(getAgentDir(), "git-write-policies.json");
const BLOCK_MESSAGE =
	"Blocked: git commit and git push are not allowed in this project. Use /git-writes to change the policy.";

function isGitWriteCommand(command: string): boolean {
	return /\bgit\s+commit\b/.test(command) || /\bgit\s+push\b/.test(command);
}

function loadConfig(): Config {
	if (!existsSync(CONFIG_PATH)) return { projects: {} };

	try {
		const value = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<Config>;
		return { projects: value.projects ?? {} };
	} catch (error) {
		console.error(`Could not read ${CONFIG_PATH}: ${error}`);
		return { projects: {} };
	}
}

function savePolicy(project: string, policy: Policy): void {
	const config = loadConfig();
	if (policy === "ask") {
		delete config.projects[project];
	} else {
		config.projects[project] = policy;
	}
	writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function canonicalPath(path: string): string {
	try {
		return realpathSync(path);
	} catch {
		return path;
	}
}

export default function (pi: ExtensionAPI) {
	let project = canonicalPath(process.cwd());
	let policy: Policy = "ask";

	function updateStatus(ctx: ExtensionContext): void {
		const color = policy === "allow" ? "success" : policy === "block" ? "warning" : "dim";
		ctx.ui.setStatus("git-writes", ctx.ui.theme.fg(color, `git writes: ${policy}`));
	}

	function setPolicy(nextPolicy: Policy, ctx: ExtensionContext): void {
		policy = nextPolicy;
		savePolicy(project, policy);
		updateStatus(ctx);
	}

	async function allowGitWrite(ctx: ExtensionContext): Promise<boolean> {
		if (policy === "allow") return true;
		if (policy === "block") return false;
		if (!ctx.hasUI) return false;

		const allowed = await ctx.ui.confirm(
			"Allow git commit and git push?",
			`Project: ${project}\n\nYour choice is saved. Use /git-writes to change it later.`,
		);
		setPolicy(allowed ? "allow" : "block", ctx);
		return allowed;
	}

	function notifyBlocked(ctx: ExtensionContext): void {
		if (ctx.hasUI) ctx.ui.notify(BLOCK_MESSAGE, "warning");
	}

	pi.on("session_start", async (_event, ctx) => {
		const result = await pi.exec("git", ["-C", ctx.cwd, "rev-parse", "--show-toplevel"], { timeout: 3000 });
		project = canonicalPath(result.code === 0 && result.stdout.trim() ? result.stdout.trim() : ctx.cwd);
		policy = loadConfig().projects[project] ?? "ask";
		updateStatus(ctx);
	});

	pi.registerCommand("git-writes", {
		description: "Allow or block git commit and git push in this project",
		handler: async (args, ctx) => {
			const requested = args.trim().toLowerCase();
			if (requested === "allow" || requested === "block" || requested === "ask") {
				setPolicy(requested, ctx);
				ctx.ui.notify(`Git write policy for ${project}: ${requested}`, "info");
				return;
			}
			if (requested) {
				ctx.ui.notify("Usage: /git-writes [allow|block|ask]", "warning");
				return;
			}
			if (!ctx.hasUI) return;

			const choices = ["Allow", "Block", "Ask on next use"];
			const choice = await ctx.ui.select(`Git commit/push policy for:\n${project}\n\nCurrent: ${policy}`, choices);
			if (!choice) return;

			setPolicy(choice === "Allow" ? "allow" : choice === "Block" ? "block" : "ask", ctx);
			ctx.ui.notify(`Git write policy for ${project}: ${policy}`, "info");
		},
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!isToolCallEventType("bash", event) || !isGitWriteCommand(event.input.command)) return;
		if (await allowGitWrite(ctx)) return;

		notifyBlocked(ctx);
		return { block: true, reason: BLOCK_MESSAGE };
	});

	pi.on("user_bash", async (event, ctx) => {
		if (!isGitWriteCommand(event.command)) return;
		if (await allowGitWrite(ctx)) return;

		notifyBlocked(ctx);
		return {
			result: {
				output: BLOCK_MESSAGE,
				exitCode: 1,
				cancelled: false,
				truncated: false,
			},
		};
	});
}
