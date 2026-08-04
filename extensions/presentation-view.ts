import {
	getMarkdownTheme,
	type ExtensionAPI,
	type ExtensionContext,
	type Theme,
} from "@earendil-works/pi-coding-agent";
import {
	Box,
	Container,
	Markdown,
	Spacer,
	matchesKey,
	truncateToWidth,
	type TUI,
} from "@earendil-works/pi-tui";

type Exchange = {
	prompt: string;
	answer?: string;
};

function contentToMarkdown(content: unknown): string {
	if (typeof content === "string") return content.trim();
	if (!Array.isArray(content)) return "";

	return content
		.flatMap((block): string[] => {
			if (!block || typeof block !== "object") return [];
			const item = block as { type?: string; text?: unknown };
			if (item.type === "text" && typeof item.text === "string") return [item.text.trim()];
			if (item.type === "image") return ["*[Image attachment]*"];
			return [];
		})
		.filter(Boolean)
		.join("\n\n")
		.trim();
}

function collectExchanges(ctx: ExtensionContext): Exchange[] {
	const exchanges: Exchange[] = [];
	let current: Exchange | undefined;

	// Match the entries represented by pi's currently open, compaction-aware transcript.
	for (const entry of ctx.sessionManager.buildContextEntries()) {
		if (entry.type !== "message") continue;
		const message = entry.message;

		if (message.role === "user") {
			const prompt = contentToMarkdown(message.content);
			if (!prompt) continue;
			current = { prompt };
			exchanges.push(current);
			continue;
		}

		if (message.role !== "assistant" || !current) continue;
		if (message.stopReason === "aborted" || message.stopReason === "error") continue;
		if (message.content.some((block) => block.type === "toolCall")) continue;

		const answer = message.content
			.filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
			.map((block) => block.text.trim())
			.filter(Boolean)
			.join("\n\n")
			.trim();

		if (answer) current.answer = answer;
	}

	return exchanges;
}

class PresentationView {
	private readonly content = new Container();
	private scrollOffset = 0;

	constructor(
		private readonly tui: TUI,
		private readonly theme: Theme,
		exchanges: Exchange[],
		private readonly close: () => void,
	) {
		const markdownTheme = getMarkdownTheme();

		// Enable mouse-wheel reporting only while this overlay is open.
		this.tui.terminal.write("\x1b[?1000h\x1b[?1006h");

		for (const [index, exchange] of exchanges.entries()) {
			if (index > 0) this.content.addChild(new Spacer(1));

			const prompt = new Box(1, 1, (text) => theme.bg("userMessageBg", text));
			prompt.addChild(
				new Markdown(exchange.prompt, 0, 0, markdownTheme, {
					color: (text) => theme.fg("userMessageText", text),
				}),
			);
			this.content.addChild(prompt);

			if (exchange.answer) {
				this.content.addChild(new Spacer(1));
				this.content.addChild(new Markdown(exchange.answer, 1, 0, markdownTheme));
			}
		}
	}

	handleInput(data: string): void {
		const mouse = /^\x1b\[<(\d+);\d+;\d+[Mm]$/.exec(data);

		if (mouse && (Number(mouse[1]) & 64) !== 0) {
			// SGR mouse buttons 64 and 65 are wheel up and wheel down.
			this.scrollBy((Number(mouse[1]) & 1) === 0 ? -3 : 3);
		} else if (matchesKey(data, "escape") || matchesKey(data, "f8")) {
			this.close();
		} else if (matchesKey(data, "up")) {
			this.scrollBy(-1);
		} else if (matchesKey(data, "down")) {
			this.scrollBy(1);
		} else {
			return;
		}

		this.tui.requestRender();
	}

	private scrollBy(lines: number): void {
		this.scrollOffset = Math.max(0, this.scrollOffset + lines);
	}

	render(width: number): string[] {
		const height = Math.max(1, this.tui.terminal.rows);
		const allLines = this.content.render(width);
		const maxOffset = Math.max(0, allLines.length - height);
		this.scrollOffset = Math.min(this.scrollOffset, maxOffset);

		const visible = allLines.slice(this.scrollOffset, this.scrollOffset + height);
		while (visible.length < height) visible.push("");

		// Full-width rows make the overlay opaque, hiding the normal transcript.
		return visible.map((line) => truncateToWidth(line, width, "", true));
	}

	invalidate(): void {
		this.content.invalidate();
	}

	dispose(): void {
		this.tui.terminal.write("\x1b[?1006l\x1b[?1000l");
	}
}

export default function (pi: ExtensionAPI) {
	let closeOverlay: (() => void) | undefined;

	pi.registerShortcut("f8", {
		description: "Toggle presentation view",
		handler: async (ctx) => {
			if (closeOverlay) {
				closeOverlay();
				return;
			}
			if (ctx.mode !== "tui") return;

			const exchanges = collectExchanges(ctx);
			let thisClose: (() => void) | undefined;

			try {
				await ctx.ui.custom<void>(
					(tui, theme, _keybindings, done) => {
						thisClose = () => done();
						closeOverlay = thisClose;
						return new PresentationView(tui, theme, exchanges, thisClose);
					},
					{
						overlay: true,
						overlayOptions: {
							anchor: "top-left",
							width: "100%",
							maxHeight: "100%",
							margin: 0,
						},
					},
				);
			} finally {
				if (closeOverlay === thisClose) closeOverlay = undefined;
			}
		},
	});
}
