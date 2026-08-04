import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  truncateHead,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

const REVIEW_PROMPT = `Use a separate read-only reviewer for this request:

{{REQUEST}}

Invoke it with exactly:

\`pi -p --model github-copilot/claude-opus-5 --tools read,bash --no-session\`

Formulate a self-contained prompt for the reviewer that accurately interprets my request and supplies any necessary repository context. Require it to remain read-only and return concrete, actionable findings with relevant file and line references.

Critically triage its response yourself rather than blindly accepting it. Implement warranted improvements unless my request asks only for analysis, run appropriate verification, and finish with a concise summary of the findings, decisions, changes, and checks.`;

function quoteArgument(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("review", {
    description: "Load the review prompt into the editor without submitting it",
    handler: (args, ctx) => {
      const request = args.trim() || "Review the work currently in context.";
      ctx.ui.setEditorText(REVIEW_PROMPT.replace("{{REQUEST}}", request));
    },
  });

  pi.registerCommand("code-review", {
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

      ctx.ui.setWidget("code-review", ["Running OpenCode review…"]);
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
            customType: "code-review",
            content: `$ ${invocation}\n\n${output.content}${truncationNotice}`,
            display: true,
          },
          { triggerTurn: false },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pi.sendMessage(
          {
            customType: "code-review",
            content: `$ ${invocation}\n\nFailed to run OpenCode: ${message}`,
            display: true,
          },
          { triggerTurn: false },
        );
      } finally {
        ctx.ui.setWidget("code-review", undefined);
      }
    },
  });
}
