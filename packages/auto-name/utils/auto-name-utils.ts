/**
 * Pure utility functions for auto-name extension.
 * Extracted for testability \u2014 no I/O, no pi SDK dependencies, no LLM.
 */

import * as os from "node:os";
import * as path from "node:path";

// \u2500\u2500 Constants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** Must match subagent/session.ts:SUBAGENT_SESSION_DIR */
export const SUBAGENT_SESSION_DIR = path.join(os.homedir(), ".pi", "agent", "sessions", "subagents");

/** Max chars shown in the status bar. */
export const MAX_STATUS_CHARS = 90;

// \u2500\u2500 Pure Functions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/**
 * Check if a session file path belongs to the subagent sessions directory.
 */
export function isSubagentSessionPath(sessionFilePath: string | undefined): boolean {
	if (!sessionFilePath) return false;
	return (
		sessionFilePath.startsWith(SUBAGENT_SESSION_DIR + path.sep) ||
		sessionFilePath.startsWith(`${SUBAGENT_SESSION_DIR}/`)
	);
}

/**
 * Safely extract session file path from an ExtensionContext-like object.
 */
export function extractSessionFilePath(sessionManager: unknown): string | undefined {
	try {
		if (sessionManager && typeof sessionManager === "object" && "getSessionFile" in sessionManager) {
			const getSessionFile = (sessionManager as Record<string, unknown>).getSessionFile;
			if (typeof getSessionFile === "function") {
				const raw = String(getSessionFile() ?? "");
				const cleaned = raw.replace(/[\r\n\t]+/g, "").trim();
				return cleaned || undefined;
			}
		}
	} catch {
		// Ignore errors
	}
	return undefined;
}

/**
 * Format a session name for status bar display.
 * Normalizes whitespace and clips to MAX_STATUS_CHARS.
 */
export function formatNameStatus(name: string): string {
	const singleLine = name.replace(/\s+/g, " ").trim();
	return singleLine.length > MAX_STATUS_CHARS ? `${singleLine.slice(0, MAX_STATUS_CHARS - 1)}\u2026` : singleLine;
}
