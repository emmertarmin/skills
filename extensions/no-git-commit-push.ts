import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

const BLOCK_MESSAGE =
	"Blocked: git commit and git push are always the user's responsibility. Ask the user to run this manually.";

function isForbiddenGitCommand(command: string): boolean {
	return /\bgit\s+commit\b/.test(command) || /\bgit\s+push\b/.test(command);
}

function notifyBlocked(ctx: { hasUI: boolean; ui: { notify(message: string, level: "warning"): void } }) {
	if (!ctx.hasUI) return;
	ctx.ui.notify(BLOCK_MESSAGE, "warning");
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", (event, ctx) => {
		if (!isToolCallEventType("bash", event)) return;
		if (!isForbiddenGitCommand(event.input.command)) return;

		notifyBlocked(ctx);

		return {
			block: true,
			reason: BLOCK_MESSAGE,
		};
	});

	pi.on("user_bash", (event, ctx) => {
		if (!isForbiddenGitCommand(event.command)) return;

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
