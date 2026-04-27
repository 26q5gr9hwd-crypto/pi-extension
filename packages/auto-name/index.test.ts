import * as path from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { createExtensionApiMock } from "../../tests/mock-extension-api.ts";
import autoSessionName from "./index.ts";
import { SUBAGENT_SESSION_DIR } from "./utils/auto-name-utils.ts";
import { NAME_STATUS_KEY } from "./utils/status-keys.ts";

function makeCtx(opts: { sessionFile?: string; hasUI?: boolean } = {}) {
	const setStatus = vi.fn();
	const setTitle = vi.fn();
	const ctx = {
		hasUI: opts.hasUI ?? true,
		ui: { setStatus, setTitle },
		sessionManager: {
			getSessionFile: () => opts.sessionFile ?? "/tmp/root/session.json",
		},
	} as unknown as ExtensionContext;
	return { ctx, setStatus, setTitle };
}

describe("auto-name extension", () => {
	it("derives and applies a session name from the first user prompt", async () => {
		const apiMock = createExtensionApiMock();
		autoSessionName(apiMock.api);

		const beforeAgentStart = apiMock.getHandlers("before_agent_start")[0];
		const sessionStart = apiMock.getHandlers("session_start")[0];
		if (!beforeAgentStart || !sessionStart) throw new Error("required handlers are missing");

		const { ctx, setStatus, setTitle } = makeCtx();

		await beforeAgentStart({ prompt: "Ship the next release" }, ctx);
		await sessionStart({}, ctx);

		expect(apiMock.getSessionName()).toBe("Ship the next release");
		expect(setStatus).toHaveBeenCalledWith(NAME_STATUS_KEY, "Ship the next release");
		expect(setTitle).toHaveBeenCalledWith(`\u03c0 - Ship the next release - ${path.basename(process.cwd())}`);
	});

	it("caps long prompts at 30 characters with an ellipsis", async () => {
		const apiMock = createExtensionApiMock();
		autoSessionName(apiMock.api);

		const beforeAgentStart = apiMock.getHandlers("before_agent_start")[0];
		if (!beforeAgentStart) throw new Error("before_agent_start handler missing");

		const { ctx } = makeCtx();
		await beforeAgentStart({ prompt: "x".repeat(200) }, ctx);

		const name = apiMock.getSessionName();
		expect(name.length).toBe(30);
		expect(name.endsWith("\u2026")).toBe(true);
	});

	it("cuts at the first sentence boundary", async () => {
		const apiMock = createExtensionApiMock();
		autoSessionName(apiMock.api);

		const beforeAgentStart = apiMock.getHandlers("before_agent_start")[0];
		if (!beforeAgentStart) throw new Error("before_agent_start handler missing");

		const { ctx } = makeCtx();
		await beforeAgentStart({ prompt: "Fix login bug. Then deploy to staging." }, ctx);

		expect(apiMock.getSessionName()).toBe("Fix login bug");
	});

	it("skips auto naming for subagent sessions, existing names, and blank prompts", async () => {
		const apiMock = createExtensionApiMock("Existing name");
		autoSessionName(apiMock.api);
		const beforeAgentStart = apiMock.getHandlers("before_agent_start")[0];
		if (!beforeAgentStart) throw new Error("before_agent_start handler missing");

		// Subagent session: should not set a name even when none exists.
		apiMock.setSessionName("");
		await beforeAgentStart(
			{ prompt: "Name me" },
			makeCtx({ sessionFile: `${SUBAGENT_SESSION_DIR}/child/session.json` }).ctx,
		);
		expect(apiMock.getSessionName()).toBe("");

		// Existing name: should not overwrite.
		apiMock.setSessionName("Existing name");
		await beforeAgentStart({ prompt: "Try to overwrite" }, makeCtx().ctx);
		expect(apiMock.getSessionName()).toBe("Existing name");

		// Blank prompt: should not set anything.
		apiMock.setSessionName("");
		await beforeAgentStart({ prompt: "   " }, makeCtx().ctx);
		expect(apiMock.getSessionName()).toBe("");
	});

	it("clears status when the session name disappears later", async () => {
		const apiMock = createExtensionApiMock();
		autoSessionName(apiMock.api);

		const beforeAgentStart = apiMock.getHandlers("before_agent_start")[0];
		const sessionTree = apiMock.getHandlers("session_tree")[0];
		const sessionShutdown = apiMock.getHandlers("session_shutdown")[0];
		if (!beforeAgentStart || !sessionTree || !sessionShutdown) throw new Error("required handlers are missing");

		const { ctx, setStatus } = makeCtx();
		await beforeAgentStart({ prompt: "Initial task" }, ctx);
		expect(apiMock.getSessionName()).toBe("Initial task");

		apiMock.setSessionName("");
		await sessionTree({}, ctx);
		await sessionShutdown({}, ctx);

		expect(setStatus).toHaveBeenCalledWith(NAME_STATUS_KEY, undefined);
	});
});
