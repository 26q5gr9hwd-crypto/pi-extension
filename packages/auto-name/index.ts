/**
 * Auto session name — detects purpose from first user message
 * and sets it as the session name via pi.setSessionName().
 *
 * - Auto-detect: uses pi-ai completeSimple() to summarize first message → pi.setSessionName()
 * - Footer display: shows session name in status bar via setStatus()
 * - Manual control: use built-in /name command (no custom command needed)
 * - Skips auto-detection for subagent sessions
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
	buildNameContext,
	extractNameFromResult,
	extractSessionFilePath,
	formatNameStatus,
	isSubagentSessionPath,
	NAME_SYSTEM_PROMPT,
} from "./utils/auto-name-utils.ts";
import { generateShortLabel } from "./utils/short-label.js";
import { NAME_STATUS_KEY } from "./utils/status-keys.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const AUTO_NAME_MODEL_SETTING = "AutoNameModel";
const DEFAULT_AUTO_NAME_MODEL = "mistralai/mistral-nemo";

function getGlobalSettingsPath(): string {
	const envAgentDir = process.env.PI_CODING_AGENT_DIR;
	if (envAgentDir?.trim()) {
		const expanded = envAgentDir.startsWith("~/") ? path.join(homedir(), envAgentDir.slice(2)) : envAgentDir;
		return path.join(expanded, "settings.json");
	}

	return path.join(homedir(), ".pi", "agent", "settings.json");
}

function readSettingFromFile(settingsPath: string): string | undefined {
	if (!existsSync(settingsPath)) return undefined;

	try {
		const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
		const configured = settings[AUTO_NAME_MODEL_SETTING];
		return typeof configured === "string" && configured.trim() ? configured.trim() : undefined;
	} catch {
		return undefined;
	}
}

function readAutoNameModelSetting(cwd: string): string {
	return (
		readSettingFromFile(path.join(cwd, ".pi", "settings.json")) ??
		readSettingFromFile(getGlobalSettingsPath()) ??
		DEFAULT_AUTO_NAME_MODEL
	);
}

function isSubagentSession(ctx: ExtensionContext): boolean {
	const sessionFilePath = extractSessionFilePath(ctx.sessionManager);
	return isSubagentSessionPath(sessionFilePath);
}

async function detectNameFromMessage(userMessage: string, ctx: ExtensionContext): Promise<string> {
	return generateShortLabel(ctx, {
		systemPrompt: NAME_SYSTEM_PROMPT,
		prompt: buildNameContext(userMessage),
		modelReference: readAutoNameModelSetting(ctx.cwd ?? process.cwd()),
		extractText: extractNameFromResult,
	});
}

// ── Extension ────────────────────────────────────────────────────────────────

export default function autoSessionName(pi: ExtensionAPI) {
	const updateTerminalTitle = (ctx: ExtensionContext) => {
		if (!ctx.hasUI) return;
		const cwdBasename = path.basename(process.cwd());
		const name = pi.getSessionName();
		if (!name) return;
		ctx.ui.setTitle(`π - ${name} - ${cwdBasename}`);
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

	// ── Auto Name (async) ──────────────────────────────────────

	pi.on("before_agent_start", async (event, ctx) => {
		if (isSubagentSession(ctx)) return;

		// name이 이미 있으면 스킵
		if (pi.getSessionName()) return;

		const text = event.prompt.trim();
		if (!text) return;

		// Fire-and-forget: 비동기로 name 감지 후 설정
		(async () => {
			try {
				const detected = await detectNameFromMessage(text, ctx);
				if (detected && !pi.getSessionName()) {
					pi.setSessionName(detected);
					updateStatus(ctx);
				}
			} catch {
				// 실패 시 무시
			}
		})();
	});

	// ── Lifecycle ─────────────────────────────────────────────────

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
