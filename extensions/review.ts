import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  truncateHead,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

function quoteArgument(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function extractFinalMessage(output: string): string | undefined {
  const messages = new Map<string, Map<string, string>>();
  let finalMessageId: string | undefined;

  for (const line of output.split("\n")) {
    if (!line.trim()) continue;

    try {
      const event = JSON.parse(line) as {
        type?: string;
        part?: { id?: string; messageID?: string; type?: string; text?: string };
      };
      const part = event.part;
      if (
        event.type !== "text" ||
        part?.type !== "text" ||
        typeof part.text !== "string" ||
        typeof part.messageID !== "string"
      ) {
        continue;
      }

      const parts = messages.get(part.messageID) ?? new Map<string, string>();
      parts.set(part.id ?? `part-${parts.size}`, part.text);
      messages.set(part.messageID, parts);
      finalMessageId = part.messageID;
    } catch {
      // OpenCode may mix diagnostics into stdout. Ignore non-JSON lines.
    }
  }

  if (!finalMessageId) return undefined;
  const text = [...messages.get(finalMessageId)!.values()].join("").trim();
  return text || undefined;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("review", {
    description: "Run OpenCode's read-only reviewer and add its output to the session context",
    handler: async (args, ctx) => {
      const request = args.trim() || "all uncommitted changes";
      const prompt = [
        `Review ${request} for bugs and regressions.`,
        "Inspect the relevant diffs and the complete changed files.",
        "Do not modify files. Return only actionable findings, ordered by severity, with file and line references.",
      ].join(" ");
      const commandArgs = [
        "run",
        "--format",
        "json",
        "--model",
        "github-copilot/claude-opus-5",
        "--agent",
        "plan",
        "--",
        ...prompt.split(/\s+/),
      ];
      const invocation = ["opencode", ...commandArgs.map(quoteArgument)].join(" ");

      const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      let frame = 0;
      ctx.ui.setWidget("review", [`${frames[frame++ % frames.length]} Running OpenCode review…`]);
      const timer = setInterval(() => {
        ctx.ui.setWidget("review", [`${frames[frame++ % frames.length]} Running OpenCode review…`]);
      }, 100);

      try {
        const result = await pi.exec("opencode", commandArgs, { cwd: ctx.cwd });
        const review = extractFinalMessage(result.stdout);
        if (result.code !== 0 || result.killed || !review) {
          const diagnostics = [
            `$ ${invocation}`,
            result.stderr.trim() && `stderr:\n${result.stderr.trimEnd()}`,
            !review && result.stdout.trim() && `stdout:\n${result.stdout.trimEnd()}`,
            `exit code: ${result.code}${result.killed ? " (killed)" : ""}`,
          ].filter(Boolean).join("\n\n");
          throw new Error(diagnostics);
        }

        const output = truncateHead(review, {
          maxBytes: DEFAULT_MAX_BYTES,
          maxLines: DEFAULT_MAX_LINES,
        });
        const truncationNotice = output.truncated
          ? "\n\n[OpenCode review truncated to Pi's context limits.]"
          : "";

        pi.sendMessage(
          {
            customType: "review",
            content: `${output.content}${truncationNotice}`,
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
        clearInterval(timer);
        ctx.ui.setWidget("review", undefined);
      }
    },
  });
}
