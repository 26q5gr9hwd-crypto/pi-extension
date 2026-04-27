/**
 * Auto session name \u2014 derives a name from the first user message via plain
 * string truncation and sets it as the session name via pi.setSessionName().
 *
 * - LLM-free: no @mariozechner/pi-ai dependency, no API calls, no model
 *   selection, no settings.json lookup.
 * - Synchronous: name is set inside the before_agent_start handler so the
 *   title is correct from the very first turn.
 * - Footer display: shows session name in status bar via setStatus()
 * - Manual control: use built-in /name command (no custom command needed)
 * - Skips auto-detection for subagent sessions and never overwrites an
 *   existing session name.
 */

import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { extractSessionFilePath, formatNameStatus, isSubagentSessionPath } from "./utils/auto-name-utils.ts";
import { capFirstMessage } from "./utils/cap-name.ts";
import { NAME_STATUS_KEY } from "./utils/status-keys.ts";

function isSubagentSession(ctx: ExtensionContext): boolean {
	return isSubagentSessionPath(extractSessionFilePath(ctx.sessionManager));
}

export default function autoSessionName(pi: ExtensionAPI) {
	const updateTerminalTitle = (ctx: ExtensionContext) => {
		if (!ctx.hasUI) return;
		const cwdBasename = path.basename(process.cwd());
		const name = pi.getSessionName();
		if (!name) return;
		ctx.ui.setTitle(`\u03c0 - ${name} - ${cwdBasename}`);
	};

	const updateStatus = (ctx: ExtensionContext) => {
		if (!ctx.hasUI) return;

		const name = pi.getSessionName();
		if (!name) {
			ctx.ui.setStatus(NAME_STATUS_KEY, undefined);
			return;
		}

		ctx.ui.setStatus(NAME_STATUS_KEY, formatNameStatus(name));
		updateTerminalTitle(ctx);
	};

	// \u2500\u2500 Auto Name (synchronous, LLM-free) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

	pi.on("before_agent_start", (event, ctx) => {
		if (isSubagentSession(ctx)) return;
		if (pi.getSessionName()) return;

		const detected = capFirstMessage(event.prompt ?? "");
		if (!detected) return;

		pi.setSessionName(detected);
		updateStatus(ctx);
	});

	// \u2500\u2500 Lifecycle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

	pi.on("session_start", async (_event, ctx) => {
		updateStatus(ctx);
	});

	pi.on("session_tree", async (_event, ctx) => {
		updateStatus(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setStatus(NAME_STATUS_KEY, undefined);
	});
}
