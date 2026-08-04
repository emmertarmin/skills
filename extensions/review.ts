import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  truncateHead,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

function quoteArgument(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("review", {
    description: "Run OpenCode's read-only reviewer and add its output to the session context",
    handler: async (args, ctx) => {
      const request = args.trim();
      const commandArgs = [
        "run",
        "--model",
        "github-copilot/claude-opus-5",
        "--agent",
        "plan",
        "--command",
        "review",
        ...(request ? [request] : []),
      ];
      const invocation = ["opencode", ...commandArgs.map(quoteArgument)].join(" ");

      ctx.ui.setWidget("review", ["Running OpenCode review…"]);
      try {
        const result = await pi.exec("opencode", commandArgs, { cwd: ctx.cwd });
        const sections = [result.stdout.trimEnd()];
        if (result.stderr.trim()) sections.push(`stderr:\n${result.stderr.trimEnd()}`);
        sections.push(`exit code: ${result.code}${result.killed ? " (killed)" : ""}`);

        const output = truncateHead(sections.filter(Boolean).join("\n\n"), {
          maxBytes: DEFAULT_MAX_BYTES,
          maxLines: DEFAULT_MAX_LINES,
        });
        const truncationNotice = output.truncated
          ? "\n\n[OpenCode output truncated to Pi's context limits.]"
          : "";

        pi.sendMessage(
          {
            customType: "review",
            content: `$ ${invocation}\n\n${output.content}${truncationNotice}`,
            display: true,
          },
          { triggerTurn: false },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pi.sendMessage(
          {
            customType: "review",
            content: `$ ${invocation}\n\nFailed to run OpenCode: ${message}`,
            display: true,
          },
          { triggerTurn: false },
        );
      } finally {
        ctx.ui.setWidget("review", undefined);
      }
    },
  });
}
